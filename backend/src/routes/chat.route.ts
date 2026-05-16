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
    'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini',
] as const;

const chatSchema = z.object({
    mode: z.enum(['thinking', 'fast']),
    query: z.string().min(1).max(5000),
    model: z.enum(ALLOWED_MODELS),
    conversationId: z.uuid(),
});

const modeConfig = {
    fast:     { searchDepth: "basic"    as const, maxResults: 10 },
    thinking: { searchDepth: "advanced" as const, maxResults: 20 },
} as const;

declare global {
    namespace Express {
        interface Request {
            userId: string;
            requestId: string;
        }
    }
}

function streamErrorPayload(err: unknown): { error: string } {
    if (err instanceof Error) {
        return { error: err.message.slice(0, 500) };
    }
    return { error: "Unknown stream error" };
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

    let webSearchResult: any[] = [];
    let output: any;

    try {
        // ── 1. Conversation check + embedding in parallel ─────────────────────
        const [existing, embeddings] = await Promise.all([
            db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }),
            getEmbedding(query),
        ]);

        if (existing && existing.userId !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // ── 2. Create conversation with placeholder title; refine in background
        if (!existing) {
            await db.insert(conversations).values({
                id: conversationId,
                title: "New chat",
                userId,
            });
            invalidateCache(`conversations:${userId}`).catch(err =>
                console.error("Cache invalidation failed:", err)
            );

            openai.responses.create({
                model: "gpt-5.4-mini",
                input: `Generate a concise title (5 words or fewer) for this query: ${query}`,
            })
                .then(r => {
                    const title = r.output_text?.trim();
                    if (!title) return;
                    return db.update(conversations)
                        .set({ title })
                        .where(eq(conversations.id, conversationId))
                        .then(() => invalidateCache(`conversations:${userId}`));
                })
                .catch(err => console.error("Title generation failed:", err));
        }

        // ── 3. Insert user message + semantic cache check in parallel ─────────
        const [, cacheResult] = await Promise.all([
            db.insert(messages).values({ conversationId, content: query, role: "user" }),
            findCachedResult(embeddings),
        ]);

        // ── 4. Resolve web search results ─────────────────────────────────────
        if (cacheResult) {
            webSearchResult = cacheResult;
            console.log(`[chat] cache hit, ${cacheResult.length} sources`);
        } else {
            const webSearchResponse = await tavilyClient.search(query, {
                searchDepth: config.searchDepth,
                maxResults: config.maxResults,
            });
            webSearchResult = webSearchResponse.results ?? [];
            console.log(`[chat] tavily returned ${webSearchResult.length} results`);
            storeInCache(embeddings, webSearchResponse).catch(err =>
                console.error("Cache write failed:", err)
            );
        }

        // ── 5. Build prompt + create stream ───────────────────────────────────
        const prompt = PROMPT_TEMPLATE
            .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
            .replace("{{USER_QUERY}}", query);

        output = await openai.responses.create({
            model,
            instructions: SYSTEM_PROMPT,
            input: prompt,
            stream: true,
        });
    } catch (err) {
        console.error("Pre-stream error:", err);
        return res.status(500).json(streamErrorPayload(err));
    }

    // ── 6. Stream response via SSE ────────────────────────────────────────────
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantMessage = "";
    const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));

    try {
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`);

        for await (const event of output) {
            if (event.type === "response.output_text.delta") {
                assistantMessage += event.delta;
                res.write(`event: delta\ndata: ${JSON.stringify({ text: event.delta })}\n\n`);
            } else if (event.type === "response.failed") {
                throw new Error(event.response?.error?.message ?? "OpenAI response failed");
            }
        }

        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write(`event: done\ndata: {}\n\n`);
    } catch (err) {
        console.error("Stream error:", err);
        res.write(`event: error\ndata: ${JSON.stringify(streamErrorPayload(err))}\n\n`);
    } finally {
        res.end();
    }

    // ── 7. Persist whatever assistant text we produced (even on partial error)
    if (assistantMessage) {
        db.insert(messages)
            .values({ conversationId, content: assistantMessage, role: "assistant", sources })
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

    let webSearchResult: any[] = [];
    let output: any;
    let conversationHistory = "";

    try {
        // ── 1. Auth check + embedding in parallel ─────────────────────────────
        const [existing, embeddings] = await Promise.all([
            db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }),
            getEmbedding(query),
        ]);

        if (!existing) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        if (existing.userId !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // ── 2. Fetch history + cache check in parallel ────────────────────────
        const [historyRows, cacheResult] = await Promise.all([
            db.query.messages.findMany({
                where: (m, { eq }) => eq(m.conversationId, conversationId),
                orderBy: (m, { asc }) => [asc(m.createdAt)],
            }),
            findCachedResult(embeddings),
        ]);

        await db.insert(messages).values({ conversationId, content: query, role: "user" });

        // ── 3. Resolve web search results ─────────────────────────────────────
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

        // ── 4. Build prompt with web results + conversation history ───────────
        conversationHistory = historyRows
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n\n');

        const prompt = FOLLOW_UP_PROMPT_TEMPLATE
            .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
            .replace("{{USER_QUERY}}", query)
            .replace("{{CONVERSATION_HISTORY}}", conversationHistory);

        // ── 5. Create stream ──────────────────────────────────────────────────
        output = await openai.responses.create({
            model,
            instructions: SYSTEM_PROMPT,
            input: prompt,
            stream: true,
        });
    } catch (err) {
        console.error("Pre-stream error:", err);
        return res.status(500).json(streamErrorPayload(err));
    }

    // ── 6. Stream response via SSE ────────────────────────────────────────────
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantMessage = "";
    const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));

    try {
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`);

        for await (const event of output) {
            if (event.type === "response.output_text.delta") {
                assistantMessage += event.delta;
                res.write(`event: delta\ndata: ${JSON.stringify({ text: event.delta })}\n\n`);
            } else if (event.type === "response.failed") {
                throw new Error(event.response?.error?.message ?? "OpenAI response failed");
            }
        }

        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write(`event: done\ndata: {}\n\n`);
    } catch (err) {
        console.error("Stream error:", err);
        res.write(`event: error\ndata: ${JSON.stringify(streamErrorPayload(err))}\n\n`);
    } finally {
        res.end();
    }

    // ── 7. Persist whatever assistant text we produced (even on partial error)
    if (assistantMessage) {
        db.insert(messages)
            .values({ conversationId, content: assistantMessage, role: "assistant", sources })
            .then(() => Promise.all([
                invalidateCache(`conversations:${conversationId}`),
                invalidateCache(`messages:${conversationId}`),
            ]))
            .catch(err => console.error("Failed to persist assistant message:", err));
    }
});

app.use(
    express.raw({
      type: [
        "audio/mpeg",
        "audio/mp3",
        "audio/webm",
        "audio/wav",
        "audio/mp4",
        "audio/x-m4a",
      ],
      limit: "25mb",
    })
);
// ── POST /transcript ────────────────────────────────────────────────────────
app.post("/transcript", authMiddleware, chatRateLimit, async (req, res) => {
    if (!req.body || !(req.body instanceof Buffer)) {
        return res.status(400).json({ error: "No audio buffer received" });
    }
    const contentType = req.headers["content-type"] ?? "audio/webm";
    const extension = contentType.split("/")[1]?.split(";")[0] || "webm";
    const audioFile = new File([req.body], `audio.${extension}`, { type: contentType });

    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
        const stream = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "gpt-4o-mini-transcribe",
            response_format: "text",
            stream: true,
        });
        for await (const event of stream) {
            if (event.type === "transcript.text.delta") {
                res.write(`event: delta\ndata: ${JSON.stringify({ text: event.delta })}\n\n`);
            } else if (event.type === "transcript.text.done") {
                res.write(`event: done\ndata: ${JSON.stringify({ text: event.text })}\n\n`);
            }
        }
    } catch (err) {
        console.error("Transcribe stream error:", err);
        res.write(`event: error\ndata: ${JSON.stringify(streamErrorPayload(err))}\n\n`);
    } finally {
        res.end();
    }
});


export { app };
