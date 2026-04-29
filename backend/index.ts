import express from "express";
import { tavily } from "@tavily/core";
import { streamText, generateText } from "ai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT, FOLLOW_UP_PROMPT_TEMPLATE } from "./prompt";
import { authMiddleware ,fail ,chatRateLimit} from "./middleware";
import cors from "cors";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "./db/index";
import { conversations, users, messages } from "./db/schema";
import { z } from "zod";
import { findCachedResult, getEmbedding, rewriteQuery, storeInCache } from "./lib/pinecone";
import { parseSourcesFromAssistantContent } from "./lib/helper";

declare global {
    namespace Express {
        interface Request {
            userId: string;
            requestId: string;
        }
    }
}

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const app = express();

app.use(express.json());
app.use(cors());

const conversationIdParamSchema = z.object({ conversationId: z.uuid() });
const chatBodySchema = z.object({ query: z.string().trim().min(1) });
const followUpBodySchema = z.object({
    convId: z.uuid(),
    query: z.string().trim().min(1),
});
const creditsConsumeBodySchema = z.object({
    amount: z.number().int().min(1).max(100).optional().default(1),
});



app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
});



app.get("/health", (_req, res) => {
    return res.status(200).json({
        status: "ok",
        service: "backend",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});

app.get("/ready", async (_req, res) => {
    try {
        await db.select({ id: users.id }).from(users).limit(1);
        return res.status(200).json({ status: "ready" });
    } catch (error) {
        return fail(res, 503, "NOT_READY", "Service dependencies are not ready.", error);
    }
});

app.get("/me", authMiddleware, async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
    if (!user) {
        return fail(res, 404, "USER_NOT_FOUND", "User not found.");
    }
    return res.status(200).json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            provider: user.provider,
            credits: user.credits,
            createdAt: user.createdAt,
        },
    });
});

app.get("/credits", authMiddleware, async (req, res) => {
    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, req.userId)).limit(1);
    if (!user) {
        return fail(res, 404, "USER_NOT_FOUND", "User not found.");
    }
    return res.status(200).json({ credits: user.credits });
});

app.post("/credits/consume", authMiddleware, async (req, res) => {
    const parsed = creditsConsumeBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return fail(res, 400, "VALIDATION_ERROR", "Invalid credits consume body.", parsed.error.flatten());
    }

    const { amount } = parsed.data;
    const [updated] = await db.update(users)
        .set({ credits: sql`${users.credits} - ${amount}` })
        .where(and(eq(users.id, req.userId), gt(users.credits, amount - 1)))
        .returning({ credits: users.credits });

    if (!updated) {
        return fail(res, 403, "INSUFFICIENT_CREDITS", "Insufficient credits.");
    }

    return res.status(200).json({ credits: updated.credits });
});

app.get("/conversations", authMiddleware, async (req, res) => {
    const rows = await db.query.conversations.findMany({
        where: (c, { eq }) => eq(c.userId, req.userId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    return res.status(200).json({ conversations: rows });
});

app.get("/conversations/:conversationId", authMiddleware, async (req, res) => {
    const parsed = conversationIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return fail(res, 400, "VALIDATION_ERROR", "Invalid conversation id.", parsed.error.flatten());
    }
    const { conversationId } = parsed.data;

    const conversation = await db.query.conversations.findFirst({
        where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
        with: {
            messages: {
                orderBy: (m, { desc }) => [desc(m.createdAt)],
            },
        },
    });

    if (!conversation) {
        return fail(res, 404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }

    return res.status(200).json({ conversation });
});

app.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
    const parsedParams = conversationIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        return fail(res, 400, "VALIDATION_ERROR", "Invalid conversation id.", parsedParams.error.flatten());
    }

    const { conversationId } = parsedParams.data;

    const conversation = await db.query.conversations.findFirst({
        where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
    });
    if (!conversation) {
        return fail(res, 404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }

    const rows = await db.query.messages.findMany({
        where: (m, { eq }) => eq(m.conversationId, conversationId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    return res.status(200).json({ messages: rows });
});

app.get("/conversations/:conversationId/sources", authMiddleware, async (req, res) => {
    const parsed = conversationIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return fail(res, 400, "VALIDATION_ERROR", "Invalid conversation id.", parsed.error.flatten());
    }
    const { conversationId } = parsed.data;

    const conversation = await db.query.conversations.findFirst({
        where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
        with: {
            messages: {
                where: (m, { eq }) => eq(m.role, "assistant"),
                orderBy: (m, { desc }) => [desc(m.createdAt)],
                limit: 1,
            },
        },
    });

    if (!conversation) {
        return fail(res, 404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }

    const latestAssistant = conversation.messages[0];
    const sources = latestAssistant ? parseSourcesFromAssistantContent(latestAssistant.content) : [];

    return res.status(200).json({ conversationId, sources });
});

app.post("/chat", authMiddleware, chatRateLimit, async (req, res) => {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return fail(res, 400, "VALIDATION_ERROR", "Invalid chat body.", parsed.error.flatten());
    }

    const { query } = parsed.data;
    const [user] = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
    if (!user) {
        return fail(res, 404, "USER_NOT_FOUND", "User not found.");
    }
    if (user.credits <= 0) {
        return fail(res, 403, "INSUFFICIENT_CREDITS", "Insufficient credits.");
    }

    const [creditUpdated] = await db.update(users)
        .set({ credits: sql`${users.credits} - 1` })
        .where(and(eq(users.id, req.userId), gt(users.credits, 0)))
        .returning({ id: users.id });
    if (!creditUpdated) {
        return fail(res, 403, "INSUFFICIENT_CREDITS", "Insufficient credits.");
    }

    const rewrittenQuery = await rewriteQuery(query);
    const embedding = await getEmbedding(rewrittenQuery);
    if (!embedding) {
        return fail(res, 500, "EMBEDDING_FAILED", "Failed to generate embedding.");
    }

    let webSearchResult: Array<{ url?: string; title?: string }> = [];
    const cached = await findCachedResult(embedding);
    if (cached) {
        webSearchResult = JSON.parse((cached.searchResults as string) ?? "[]");
    } else {
        const webSearchResponse = await client.search(rewrittenQuery, {
            searchDepth: "advanced",
            maxResults: 10,
        });
        webSearchResult = webSearchResponse.results ?? [];
        await storeInCache(embedding, {
            query,
            rewrittenQuery,
            searchResults: webSearchResult,
        });
    }

    const title = await generateText({
        model: "openai/gpt-4o",
        prompt: `Generate a short title for: ${query}`,
    });

    const [conversation] = await db.insert(conversations).values({
        title: title.text,
        userId: user.id,
    }).returning();
    if (!conversation) {
        return fail(res, 500, "CONVERSATION_CREATE_FAILED", "Failed to create conversation.");
    }

    await db.insert(messages).values({
        conversationId: conversation.id,
        content: query,
        role: "user",
    });

    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query);

    const llm = streamText({
        model: "openai/gpt-5.4",
        prompt,
        system: SYSTEM_PROMPT,
    });

    res.header("Cache-Control", "no-cache");
    res.header("Content-Type", "text/event-stream");
    res.header("Connection", "keep-alive");

    try {
        for await (const chunk of llm.textStream) {
            res.write(`event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));
        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write("event: done\ndata: {}\n\n");
        res.end();

        const finalOutput = await llm.text;
        const persistedAssistantMessage = `${finalOutput}\n<SOURCES>\n${JSON.stringify(sources)}\n</SOURCES>\n`;
        await db.insert(messages).values({
            conversationId: conversation.id,
            content: persistedAssistantMessage,
            role: "assistant",
        });
    } catch (error) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: "Streaming failed" })}\n\n`);
        res.end();
        throw error;
    }
});

app.post("/chat/followup", authMiddleware, chatRateLimit, async (req, res) => {
    const parsed = followUpBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return fail(res, 400, "VALIDATION_ERROR", "Invalid followup body.", parsed.error.flatten());
    }

    const { convId, query } = parsed.data;

    const conversation = await db.query.conversations.findFirst({
        where: (c, { eq, and }) => and(eq(c.id, convId), eq(c.userId, req.userId)),
        with: {
            messages: {
                orderBy: (m, { desc }) => [desc(m.createdAt)],
                limit: 30,
            },
        },
    });
    if (!conversation) {
        return fail(res, 404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }
    const [creditUpdated] = await db.update(users)
        .set({ credits: sql`${users.credits} - 1` })
        .where(and(eq(users.id, req.userId), gt(users.credits, 0)))
        .returning({ id: users.id });
    if (!creditUpdated) {
        return fail(res, 403, "INSUFFICIENT_CREDITS", "Insufficient credits.");
    }

    await db.insert(messages).values({
        conversationId: convId,
        content: query,
        role: "user",
    });

    const prompt = FOLLOW_UP_PROMPT_TEMPLATE
        .replace("{{CONVERSATION_HISTORY}}", JSON.stringify(conversation))
        .replace("{{USER_QUERY}}", query);

    const llm = streamText({
        model: "openai/gpt-5.4",
        prompt,
        system: SYSTEM_PROMPT,
    });

    res.header("Cache-Control", "no-cache");
    res.header("Content-Type", "text/event-stream");
    res.header("Connection", "keep-alive");

    try {
        for await (const chunk of llm.textStream) {
            res.write(`event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
        }
        res.write("event: done\ndata: {}\n\n");
        res.end();

        const finalOutput = await llm.text;
        await db.insert(messages).values({
            conversationId: convId,
            content: finalOutput,
            role: "assistant",
        });
    } catch (error) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: "Streaming failed" })}\n\n`);
        res.end();
        throw error;
    }
});

app.use((_req, res) => {
    return fail(res, 404, "NOT_FOUND", "Route not found.");
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[unhandled]", error);
    return fail(res, 500, "INTERNAL_ERROR", "Internal server error.");
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});