import express from "express";
import { db } from "../db";
import { users, conversations, messages } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware";
import getOrSetCache, { invalidateCache } from "../lib/cache";
import { z } from "zod";
const app = express.Router();

const uuidSchema = z.string().uuid();

const conversationIdParam = z.object({ id: z.string().uuid() });

const patchConversationBody = z.object({
    conversationId: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
});

app.get("/me", authMiddleware, async (req, res) => {
    try {
        const [user] = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
        if (!user) {
            return res.status(404).json({ error: "User Not Found" });
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
    } catch (error) {
        throw error;
    }
});

app.get("/conversations",authMiddleware, async (req, res) => {
    // cache converstion if not cached 
    try {
        const conversations = await getOrSetCache(`conversations:${req.userId}`,async()=>{
            const rows = await db.query.conversations.findMany({
                where: (c, { eq }) => eq(c.userId, req.userId),
                orderBy: (c, { desc }) => [desc(c.createdAt)],
            });
            return rows;
        })
        
        return res.status(200).json(conversations);
    } catch (error) {
        throw error;
    }
});

app.get("/conversations/:conversationId", authMiddleware, async (req, res) => {
    const parsed = uuidSchema.safeParse(req.params.conversationId);
    if (!parsed.success) return res.status(400).json({ error: "Invalid conversation id" });
    const conversationId = parsed.data;

    try {
        const conversation = await getOrSetCache(`conversations:${conversationId}`, async () => {
            return db.query.conversations.findFirst({
                where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
                with: {
                    messages: {
                        orderBy: (m, { asc }) => [asc(m.createdAt)],
                    },
                },
            });
        });

        if (!conversation) return res.status(404).json({ error: "Conversation not found" });
        return res.status(200).json(conversation);
    } catch (error) {
        console.error("Get conversation failed:", error);
        return res.status(500).json({ error: "Failed to fetch conversation" });
    }
});

app.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
    const parsed = uuidSchema.safeParse(req.params.conversationId);
    if (!parsed.success) return res.status(400).json({ error: "Invalid conversation id" });
    const conversationId = parsed.data;

    try {
        const owned = await db.query.conversations.findFirst({
            where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
        });
        if (!owned) return res.status(404).json({ error: "Conversation not found" });

        const rows = await getOrSetCache(`messages:${conversationId}`, async () => {
            return db.query.messages.findMany({
                where: (m, { eq }) => eq(m.conversationId, conversationId),
                orderBy: (m, { asc }) => [asc(m.createdAt)],
            });
        });
        return res.status(200).json(rows);
    } catch (error) {
        console.error("Get messages failed:", error);
        return res.status(500).json({ error: "Failed to fetch messages" });
    }
});

app.delete("/conversation/:id", authMiddleware, async (req, res) => {
    const parsed = conversationIdParam.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: "Invalid conversation id" });
    const { id } = parsed.data;

    try {
        const conv = await db.query.conversations.findFirst({
            where: eq(conversations.id, id),
        });
        if (!conv) return res.status(404).json({ error: "Conversation not found" });
        if (conv.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

        // FK: delete messages first, then the conversation
        await db.delete(messages).where(eq(messages.conversationId, id));
        await db.delete(conversations).where(eq(conversations.id, id));

        invalidateCache(`conversations:${req.userId}`).catch(() => {});
        invalidateCache(`conversations:${id}`).catch(() => {});
        invalidateCache(`messages:${id}`).catch(() => {});

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Delete conversation failed:", error);
        return res.status(500).json({ error: "Failed to delete conversation" });
    }
});

app.patch("/conversation", authMiddleware, async (req, res) => {
    const parsed = patchConversationBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { conversationId, title } = parsed.data;

    try {
        const conv = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
        });
        if (!conv) return res.status(404).json({ error: "Conversation not found" });
        if (conv.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

        await db.update(conversations).set({ title }).where(eq(conversations.id, conversationId));

        invalidateCache(`conversations:${req.userId}`).catch(() => {});
        invalidateCache(`conversations:${conversationId}`).catch(() => {});

        return res.status(200).json({ ok: true, title });
    } catch (error) {
        console.error("Patch conversation failed:", error);
        return res.status(500).json({ error: "Failed to update conversation" });
    }
});


export { app };