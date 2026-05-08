import express from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware";
const app = express();

app.get("/me", authMiddleware, async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
    if (!user) {
        return Error(" User Not Found ");
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

app.get("/conversations",authMiddleware, async (req, res) => {
    const rows = await db.query.conversations.findMany({
        where: (c, { eq }) => eq(c.userId, req.userId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    return res.status(200).json({ conversations: rows });
});

app.get("/conversations/:conversationId", authMiddleware, async (req, res) => {
    const conversationId = req.params.conversationId as string;
    

    const conversation = await db.query.conversations.findFirst({
        where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
        with: {
            messages: {
                orderBy: (m, { desc }) => [desc(m.createdAt)],
            },
        },
    });

    if (!conversation) {
        return Error("Converstion Not found ");
    }

    return res.status(200).json({ conversation });
});

app.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
    const conversationId = req.params.conversationId as string;

    const conversation = await db.query.conversations.findFirst({
        where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
    });
    if (!conversation) {
        return Error("Converstion Not found ");
    }

    const rows = await db.query.messages.findMany({
        where: (m, { eq }) => eq(m.conversationId, conversationId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    return res.status(200).json({ messages: rows });
});

export { app };