import express from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db }from "../db/index";
import { conversations ,messages } from "../db/schema";
import { openai } from "../lib/openai";
import { tavilyClient } from "../lib/tavily";
import { authMiddleware , chatRateLimit } from "../middleware";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "../prompt";
const app = express.Router();

const chatSchema = z.object({
    query: z.string().min(1).max(5000),
    conversationId: z.string().uuid(),
});

declare global {
    namespace Express {
        interface Request {
            userId: string;
            requestId: string;
        }
    }
}
app.post("/chat", authMiddleware , chatRateLimit , async (req,res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { query, conversationId } = parsed.data;
    const userId = req.userId;

    const existing = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
    });

    if (existing && existing.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // if conv not exist create a Conv title and create conv
    if ( !existing ){
        //create title
        const title = await openai.responses.create({
            model: "minimaxai/minimax-m2.7",
            input:`Create only a suitable conversation title for this chat query : ${query} `,
            stream: false
        });
        if (!title.output_text){
            throw Error("Err while generating the title")
        }
        // Creating the conv
        await db.insert(conversations).values({id:conversationId ,title:title.output_text, userId:userId}).returning(); 
    }
    // save user msg
    await db.insert(messages).values({conversationId,content:query,role:"user"})

    // force web serch 
    const webSearchResponse = await tavilyClient.search(query, {
        searchDepth: "advanced",
        maxResults: 10,
    });
    const webSearchResult = webSearchResponse.results ?? [];

    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query);


    // res generation
    const output = await openai.responses.create({
        model: "minimaxai/minimax-m2.7",
        input: prompt,
        instructions:SYSTEM_PROMPT,
        stream: true
    })

    res.header("Cache-Control", "no-cache");
    res.header("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantMessage = "";
    let streamError = false;
    try {
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`);
        for await (const event of output) {
            if (event.type === "response.output_text.delta") {
                assistantMessage += event.delta;
                res.write(event.delta);
            }
        }
        const sources = webSearchResult.map((r: any) => ({ url: r.url, title: r.title }));
        res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        res.write("event: done\ndata: {}\n\n");
    } catch (error) {
        streamError = true;
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    }
    res.end();
    if (!streamError && assistantMessage) {
        await db.insert(messages).values({conversationId, content: assistantMessage, role: "assistant"});
    }
});


export { app };