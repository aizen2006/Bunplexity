import express from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db }from "../db/index";
import { conversations ,messages } from "../db/schema";
import { openai } from "../lib/openai";
import { tavilyClient } from "../lib/tavily";
import { authMiddleware , chatRateLimit } from "../middleware";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "../prompt";
import { getEmbedding , storeInCache , findCachedResult } from "../lib/pinecone";



const app = express.Router();

const modeEnums = z.enum(['thinking','fast'])

const chatSchema = z.object({
    mode:modeEnums,
    query: z.string().min(1).max(5000),
    model:z.string(),
    conversationId: z.uuid(),
});
const followUpChatSchema = z.object({
    mode:modeEnums,
    query: z.string().min(1).max(5000),
    model:z.string(),
    conversationId: z.uuid(),
});

const modeConfig = {
    fast:     { searchDepth: "basic"    as const, maxResults: 10, effort: "medium" as const },
    thinking: { searchDepth: "advanced" as const, maxResults: 20, effort: "high"   as const },
} as const;

declare global {
    namespace Express {
        interface Request {
            userId: string;
            requestId: string;
        }
    }
}
app.post("/chat", async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { query, model, mode, conversationId } = parsed.data;
    const userId = req.userId;

    // ── 1. Auth + conversation setup (parallelized) ──────────────────────────
    const [existing, embeddings] = await Promise.all([
        db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }),
        getEmbedding(query) as Promise<number[]>,
    ]);

    if (existing?.userId !== undefined && existing.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // ── 2. Conversation + user message setup (parallelized) ──────────────────
    const setupTasks: Promise<any>[] = [
        db.insert(messages).values({ conversationId, content: query, role: "user" }),
    ];

    if (!existing) {
        setupTasks.push(
            openai.responses.create({
                model: "gpt-4.1-nano",
                input: `Create a suitable title for the following user query: ${query}`,
            }).then(async (titleRes) => {
                const title = titleRes.output_text ?? "New chat";
                await db.insert(conversations).values({ id: conversationId, title, userId });
            })
        );
    }

    // ── 3. Cache check (already have embeddings, fire in parallel with setup) ─
    await Promise.all(setupTasks);
    const cacheResult = await findCachedResult(embeddings);

    // ── 4. Resolve web search results ────────────────────────────────────────
    const config = modeConfig[mode];
    if (!config) {
        return res.status(400).json({ error: "Invalid mode" });
    }

    let webSearchResult: any[] = [];

    if (cacheResult) {
        webSearchResult = cacheResult;
    } else {
        const webSearchResponse = await tavilyClient.search(query, {
            searchDepth: config.searchDepth,
            maxResults: config.maxResults,
        });
        webSearchResult = webSearchResponse.results ?? [];
        // fire-and-forget cache write — don't block the response
        storeInCache(embeddings, webSearchResponse).catch(err =>
            console.error("Cache write failed:", err)
        );
    }

    // ── 5. Build prompt + create stream ──────────────────────────────────────
    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query);

    const output = await openai.responses.create({
        model,
        instructions:SYSTEM_PROMPT,
        input: prompt,
        reasoning: { effort: config.effort },
        stream: true,
    });

    // ── 6. Stream response ────────────────────────────────────────────────────
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantMessage = "";
    let streamError = false;

    try {
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`);

        for await (const chunk of output) {
            if (chunk) {
                assistantMessage += chunk;
                res.write(chunk);
            }
        }

        const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));
        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write("event: done\ndata: {}\n\n");
    } catch (err) {
        streamError = true;
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    } finally {
        res.end();
    }

    if (!streamError && assistantMessage) {
        await db.insert(messages).values({ conversationId, content: assistantMessage, role: "assistant" });
    }
});

app.post("/chat/follow-up", async (req, res) => {
    const parsed = followUpChatSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { query, model, mode, conversationId } = parsed.data;
    const userId = req.userId;

    const config = modeConfig[mode as keyof typeof modeConfig];
    if (!config) return res.status(400).json({ error: "Invalid mode" });

    // Auth check + embedding run in parallel — independent of each other
    const [existing, embeddings] = await Promise.all([
        db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }),
        getEmbedding(query) as Promise<number[]>,
    ]);

    if (existing?.userId !== undefined && existing.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // User message insert + cache check run in parallel — both need embeddings
    // but are independent of each other
    const [, cacheResult] = await Promise.all([
        db.insert(messages).values({ conversationId, content: query, role: "user" }),
        findCachedResult(embeddings),
    ]);

    // Resolve web results
    let webSearchResult: any[] = [];

    if (cacheResult) {
        webSearchResult = cacheResult;
    } else {
        const webSearchResponse = await tavilyClient.search(query, {
            searchDepth: config.searchDepth,
            maxResults: config.maxResults,
        });
        webSearchResult = webSearchResponse.results ?? [];

        storeInCache(embeddings, webSearchResponse).catch(err =>
            console.error("Cache write failed:", err)
        );
    }

    // Build prompt + stream
    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query);

    const output = await openai.responses.create({
        model,
        instructions:SYSTEM_PROMPT,
        input: prompt,
        reasoning: { effort: config.effort },
        stream: true,
    });

    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantMessage = "";
    let streamError = false;

    try {
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`);

        for await (const chunk of output) {
            if (chunk) {
                assistantMessage += chunk;
                res.write(chunk);
            }
        }

        const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));
        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write("event: done\ndata: {}\n\n");
    } catch {
        streamError = true;
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    } finally {
        res.end();
    }

    if (!streamError && assistantMessage) {
        await db.insert(messages).values({ conversationId, content: assistantMessage, role: "assistant" });
    }
});

export { app };