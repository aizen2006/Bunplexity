import { Router } from "express"
import z from "zod";
import { authMiddleware } from "../middleware";
import { openai } from "../lib/openai";
import { imageUploadMiddleware } from "../middleware";
import { toFile } from "openai";

const app = Router();

const imageStyles = [
    "Realistic",
    "Cinematic",
    "Anime",
    "3D Render",
    "Watercolor",
    "Oil Painting",
    "Pixel Art",
    "Comic Book",
    "Minimalist",
    "Cyberpunk",
    "Fantasy",
    "Vintage",
    "Sketch",
    "Cartoon",
    "Studio Photo"
];

const imageGenSchema = z.object({
    query:z.string(),
    size:z.enum(['auto'
        ,'1024x1024'
        ,'1536x1024'
        ,'1024x1536']).default("auto"),
    quality:z.enum([`auto`,`high`, `medium`,`low`]).default(`auto`),
    model:z.enum(['gpt-image-1','gpt-image-2']).default('gpt-image-1'),
    style:z.enum(imageStyles).default('Realistic'),
    output_format:z.enum(['png' , 'jpeg' , 'webp']).default('jpeg')
})

app.post('/generate',authMiddleware,async(req,res) => {
    const parsedData = imageGenSchema.parse(req.body);
    if(!parsedData.query) return res.status(400).json({
        message:"Error while reciving the query",
        statusCode:400
    });
    const { query , model , style , size , quality , output_format}= parsedData;

    const prompt = `
            You are an expert image generation assistant.

            Your task is to create a high-quality image that accurately reflects the user's intent.

            Instructions:
            - Carefully understand the user's request and preserve its meaning.
            - Prioritize the main subject, context, and important details mentioned by the user.
            - Apply the requested visual style consistently.
            - Produce a visually appealing composition with realistic proportions, lighting, colors, and perspective when appropriate.
            - Add reasonable details only when they enhance the image without changing the user's intent.
            - Do not include unrelated objects, text, watermarks, logos, or artifacts unless explicitly requested.
            - If the request is ambiguous, make sensible creative decisions while staying faithful to the user's description.

            User Request:
            ${query}

            Requested Style:
            ${style}
        `

    const stream = await openai.images.generate({
        model:model,
        prompt:prompt,
        size:size,
        quality:quality,
        output_format:output_format,
        stream:true,
    })

    // SSE headers
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    // Image streaming logic
    try {
        for await (const event of stream) {
            if (event.type === "image_generation.partial_image") {
                    res.write(
                    `data: ${JSON.stringify({
                    type: "partial",
                    index: event.partial_image_index,
                    image: event.b64_json,
                    })}\n\n`
                );
            }
            if (event.type === "image_generation.completed") {
                res.write(
                    `data: ${JSON.stringify({
                    type: "completed",
                    })}\n\n`
                );
            }
        }
        res.end();
    } catch (err) {
        res.write(
            `data: ${JSON.stringify({
            type: "error",
            message: "Generation failed",
            })}\n\n`
        );

        res.end();
    }
})


app.post('/edit',authMiddleware,imageUploadMiddleware.array('images'),async(req,res)=>{
    const parsedData = imageGenSchema.parse(req.body);
    if(!parsedData.query) return res.status(400).json({
        message:"Error while reciving the query",
        statusCode:400
    });
    const { query , model , style , size , quality , output_format}= parsedData;

    const files = req.files as Express.Multer.File[];

    if(!files?.length || files?.length == undefined) return res.status(400).json({
        message:"Please upload a refernce image to edit",
        statusCode:400
    })

    const prompt = `
            You are an expert image generation assistant.

            Your task is to create a high-quality image that accurately reflects the user's intent.

            Instructions:
            - Carefully understand the user's request and preserve its meaning.
            - Prioritize the main subject, context, and important details mentioned by the user.
            - Apply the requested visual style consistently.
            - Produce a visually appealing composition with realistic proportions, lighting, colors, and perspective when appropriate.
            - Add reasonable details only when they enhance the image without changing the user's intent.
            - Do not include unrelated objects, text, watermarks, logos, or artifacts unless explicitly requested.
            - If the request is ambiguous, make sensible creative decisions while staying faithful to the user's description.

            User Request:
            ${query}

            Requested Style:
            ${style}
        `

    const images = await Promise.all(
        files.map((file) =>
            toFile(file.buffer, file.originalname, {
                type: file.mimetype,
                }
            )
        )
    );

    const stream = await openai.images.edit({
        model:model,
        prompt:prompt,
        size:size,
        image:images,
        quality:quality,
        output_format:output_format,
        stream:true,
    })
    // SSE headers 
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Image streaming logic
    try {
        for await (const event of stream) {
            if (event.type === "image_edit.partial_image") {
                res.write(
                    `data: ${JSON.stringify({
                    type: "partial",
                    index: event.partial_image_index,
                    image: event.b64_json,
                    })}\n\n`
                );
            }
            if (event.type === "image_edit.completed") {
                res.write(
                    `data: ${JSON.stringify({
                    type: "completed",
                    })}\n\n`
                );
            }
        }
        res.end();
    } catch (err) {
        res.write(
            `data: ${JSON.stringify({
            type: "error",
            message: "Generation failed",
            })}\n\n`
        );

        res.end();
    }

})

export { app };