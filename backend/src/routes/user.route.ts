import express from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware";
import getOrSetCache from "../lib/cache";
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
    // cache converstion if not cached 
    const conversations = await getOrSetCache(`conversations?${req.userId}`,async()=>{
        const rows = await db.query.conversations.findMany({
            where: (c, { eq }) => eq(c.userId, req.userId),
            orderBy: (c, { desc }) => [desc(c.createdAt)],
        });
        return rows;
    })
    
    return res.status(200).json(conversations);
});

app.get("/conversations/:conversationId", authMiddleware, async (req, res) => {
    const conversationId = req.params.conversationId as string;
    
    const conversation = await getOrSetCache(`conversations:${conversationId}`,async() => {
        const conversation = await db.query.conversations.findFirst({
            where: (c, { eq, and }) => and(eq(c.id, conversationId), eq(c.userId, req.userId)),
            with: {
                messages: {
                    orderBy: (m, { desc }) => [desc(m.createdAt)],
                },
            },
        });

        return conversation;
    })

    return res.status(200).json(conversation);
});

app.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
    const conversationId = req.params.conversationId as string;

    const messages = await getOrSetCache(`messages:${conversationId}`,async ()=>{
        const rows = await db.query.messages.findMany({
            where: (m, { eq }) => eq(m.conversationId, conversationId),
            orderBy: (m, { desc }) => [desc(m.createdAt)],
        });

        return rows;
    })
    
    return res.status(200).json(messages);
});

export { app };