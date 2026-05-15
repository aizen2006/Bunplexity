import express from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { conversations, messages } from "../db/schema";
import { openai } from "../lib/openai";
import { tavilyClient } from "../lib/tavily";
import { authMiddleware, chatRateLimit } from "../middleware";
import { PROMPT_TEMPLATE, FOLLOW_UP_PROMPT_TEMPLATE, SYSTEM_PROMPT } from "../prompt";
import { getEmbedding, storeInCache, findCachedResult } from "../lib/pinecone";
import { invalidateCache } from "../lib/cache";

const app = express.Router();

const ALLOWED_MODELS = [
    'gpt-5.5', 'gpt-5.5-pro',
    'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano',
    'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
] as const;

const chatSchema = z.object({
    mode: z.enum(['thinking', 'fast']),
    query: z.string().min(1).max(5000),
    model: z.enum(ALLOWED_MODELS),
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

// ── POST /chat ───────────────────────────────────────────────────────────────
app.post("/chat", authMiddleware, chatRateLimit, async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { query, model, mode, conversationId } = parsed.data;
    const userId = req.userId;
    const config = modeConfig[mode];

    // ── 1. Conversation check + embedding in parallel ─────────────────────────
    const [existing, embeddings] = await Promise.all([
        db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }),
        getEmbedding(query) as Promise<number[]>,
    ]);

    if (existing && existing.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // ── 2. Create conversation before inserting message (fixes FK ordering) ───
    if (!existing) {
        const titleRes = await openai.responses.create({
            model: "gpt-5-nano",
            input: `Generate a concise title (5 words or fewer) for this query: ${query}`,
        });
        await db.insert(conversations).values({
            id: conversationId,
            title: titleRes.output_text?.trim() ?? "New chat",
            userId,
        });
        invalidateCache(`conversations:${userId}`).catch(err =>
            console.error("Cache invalidation failed:", err)
        );
    }

    // ── 3. Insert user message + semantic cache check in parallel ─────────────
    const [, cacheResult] = await Promise.all([
        db.insert(messages).values({ conversationId, content: query, role: "user" }),
        findCachedResult(embeddings),
    ]);

    // ── 4. Resolve web search results ─────────────────────────────────────────
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

    // ── 5. Build prompt + create stream ───────────────────────────────────────
    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query);

    const output = await openai.responses.create({
        model,
        instructions: SYSTEM_PROMPT,
        input: prompt,
        reasoning: { effort: config.effort },
        stream: true,
    });

    // ── 6. Stream response via SSE ────────────────────────────────────────────
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantMessage = "";
    let streamError = false;

    try {
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`);

        for await (const event of output) {
            if (event.type === 'response.output_text.delta') {
                const delta = event.delta;
                assistantMessage += delta;
                res.write(delta);
            }
        }

        const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));
        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write("event: done\ndata: {}\n\n");
    } catch (err) {
        streamError = true;
        console.error("Stream error:", err);
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    } finally {
        res.end();
    }

    // ── 7. Persist assistant message + bust caches (fire-and-forget) ──────────
    if (!streamError && assistantMessage) {
        db.insert(messages)
            .values({ conversationId, content: assistantMessage, role: "assistant" })
            .then(() => Promise.all([
                invalidateCache(`conversations:${conversationId}`),
                invalidateCache(`messages:${conversationId}`),
            ]))
            .catch(err => console.error("Failed to persist assistant message:", err));
    }
});

// ── POST /chat/follow-up ─────────────────────────────────────────────────────
app.post("/chat/follow-up", authMiddleware, chatRateLimit, async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { query, model, mode, conversationId } = parsed.data;
    const userId = req.userId;
    const config = modeConfig[mode];

    // ── 1. Auth check + embedding in parallel ─────────────────────────────────
    const [existing, embeddings] = await Promise.all([
        db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }),
        getEmbedding(query) as Promise<number[]>,
    ]);

    if (!existing) {
        return res.status(404).json({ error: "Conversation not found" });
    }
    if (existing.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // ── 2. Fetch history + cache check in parallel (before inserting new msg) ─
    const [historyRows, cacheResult] = await Promise.all([
        db.query.messages.findMany({
            where: (m, { eq }) => eq(m.conversationId, conversationId),
            orderBy: (m, { asc }) => [asc(m.createdAt)],
        }),
        findCachedResult(embeddings),
    ]);

    await db.insert(messages).values({ conversationId, content: query, role: "user" });

    // ── 3. Resolve web search results ─────────────────────────────────────────
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

    // ── 4. Build prompt with web results + conversation history ───────────────
    const conversationHistory = historyRows
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

    const prompt = FOLLOW_UP_PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query)
        .replace("{{CONVERSATION_HISTORY}}", conversationHistory);

    // ── 5. Create stream ──────────────────────────────────────────────────────
    const output = await openai.responses.create({
        model,
        instructions: SYSTEM_PROMPT,
        input: prompt,
        reasoning: { effort: config.effort },
        stream: true,
    });

    // ── 6. Stream response via SSE ────────────────────────────────────────────
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantMessage = "";
    let streamError = false;

    try {
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`);

        for await (const event of output) {
            if (event.type === 'response.output_text.delta') {
                const delta = event.delta;
                assistantMessage += delta;
                res.write(delta);
            }
        }

        const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));
        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write("event: done\ndata: {}\n\n");
    } catch (err) {
        streamError = true;
        console.error("Stream error:", err);
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    } finally {
        res.end();
    }

    // ── 7. Persist assistant message + bust caches (fire-and-forget) ──────────
    if (!streamError && assistantMessage) {
        db.insert(messages)
            .values({ conversationId, content: assistantMessage, role: "assistant" })
            .then(() => Promise.all([
                invalidateCache(`conversations:${conversationId}`),
                invalidateCache(`messages:${conversationId}`),
            ]))
            .catch(err => console.error("Failed to persist assistant message:", err));
    }
});

export { app };
