import { Router } from "express"
import type { Response } from "express";
import z from "zod";
import { authMiddleware } from "../middleware";
import { openai } from "../lib/openai";
import { imageUploadMiddleware } from "../middleware";
import { toFile } from "openai";
import { db } from "../db";
import { images } from "../db/schema";
import uploadImage, { getImagePublicUrl, deleteImages } from "../lib/fileUpload";
import { and, desc, eq, gt } from "drizzle-orm";
import { log } from "../lib/logger";

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
});

function buildPrompt(query: string, style: string) {
    return `
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
        `;
}

interface ImageMeta {
    userId: string;
    prompt: string;
    style: string;
    size: string;
    model: string;
    type: "generate" | "edit";
    outputFormat: "png" | "jpeg" | "webp";
}

// Maps the requested output format to the Content-Type / extension we store the
// object with, so the bucket's public URL renders directly in an <img> tag.
const FORMAT_MAP: Record<string, { mime: string; ext: string }> = {
    png:  { mime: "image/png",  ext: "png" },
    jpeg: { mime: "image/jpeg", ext: "jpg" },
    webp: { mime: "image/webp", ext: "webp" },
};

/**
 * Upload the final base64 image to the bucket, persist a row, and announce a
 * durable URL over SSE. Errors are reported as an SSE frame — the response has
 * already been flushed, so we must NOT call res.status()/res.json() here.
 */
async function persistAndAnnounce(res: Response, base64: string, meta: ImageMeta) {
    try {
        const { mime, ext } = FORMAT_MAP[meta.outputFormat] ?? { mime: "image/png", ext: "png" };
        const result = await uploadImage(Buffer.from(base64, "base64"), mime, ext);
        if (!result.uploadStatus || !result.data?.path) {
            log("error", "Image upload to bucket failed", result.error);
            res.write(`data: ${JSON.stringify({ type: "error", message: "Failed to save image" })}\n\n`);
            return;
        }

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const [row] = await db
            .insert(images)
            .values({
                userId: meta.userId,
                prompt: meta.prompt,
                style: meta.style,
                size: meta.size,
                model: meta.model,
                type: meta.type,
                storagePath: result.data.path,
                expiresAt,
            })
            .returning({ id: images.id, createdAt: images.createdAt });

        if (!row) {
            res.write(`data: ${JSON.stringify({ type: "error", message: "Failed to save image" })}\n\n`);
            return;
        }

        res.write(
            `data: ${JSON.stringify({
                type: "saved",
                id: row.id,
                url: getImagePublicUrl(result.data.path),
                createdAt: row.createdAt,
                expiresAt: expiresAt.toISOString(),
            })}\n\n`
        );
    } catch (err) {
        log("error", "Failed to persist generated image", err);
        res.write(`data: ${JSON.stringify({ type: "error", message: "Failed to save image" })}\n\n`);
    }
}

app.post('/generate',authMiddleware,async(req,res) => {
    const parsedData = imageGenSchema.parse(req.body);
    if(!parsedData.query) return res.status(400).json({
        message:"Error while reciving the query",
        statusCode:400
    });
    const { query , model , style , size , quality , output_format}= parsedData;

    const prompt = buildPrompt(query, style);

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
    let latestB64: string | undefined;
    try {
        for await (const event of stream) {
            if (event.type === "image_generation.partial_image") {
                latestB64 = event.b64_json;
                res.write(
                    `data: ${JSON.stringify({
                    type: "partial",
                    index: event.partial_image_index,
                    image: event.b64_json,
                    })}\n\n`
                );
            }
            if (event.type === "image_generation.completed") {
                if ((event as any).b64_json) latestB64 = (event as any).b64_json;
                res.write(`data: ${JSON.stringify({ type: "completed" })}\n\n`);
                if (latestB64) {
                    await persistAndAnnounce(res, latestB64, {
                        userId: req.userId, prompt: query, style, size, model, type: "generate", outputFormat: output_format,
                    });
                }
            }
        }
        res.end();
    } catch (err) {
        log("error", "Image generation stream error", err);
        res.write(`data: ${JSON.stringify({ type: "error", message: "Generation failed" })}\n\n`);
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

    const prompt = buildPrompt(query, style);

    const images_arr = await Promise.all(
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
        image:images_arr,
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
    let latestB64: string | undefined;
    try {
        for await (const event of stream) {
            if (event.type === "image_edit.partial_image") {
                latestB64 = event.b64_json;
                res.write(
                    `data: ${JSON.stringify({
                    type: "partial",
                    index: event.partial_image_index,
                    image: event.b64_json,
                    })}\n\n`
                );
            }
            if (event.type === "image_edit.completed") {
                if ((event as any).b64_json) latestB64 = (event as any).b64_json;
                res.write(`data: ${JSON.stringify({ type: "completed" })}\n\n`);
                if (latestB64) {
                    await persistAndAnnounce(res, latestB64, {
                        userId: req.userId, prompt: query, style, size, model, type: "edit", outputFormat: output_format,
                    });
                }
            }
        }
        res.end();
    } catch (err) {
        log("error", "Image edit stream error", err);
        res.write(`data: ${JSON.stringify({ type: "error", message: "Generation failed" })}\n\n`);
        res.end();
    }

})

// ── GET /image/history ───────────────────────────────────────────────────────
// The user's non-expired generated images, newest first, with public URLs.
app.get('/history',authMiddleware,async(req,res) => {
    try {
        const rows = await db
            .select()
            .from(images)
            .where(and(eq(images.userId, req.userId), gt(images.expiresAt, new Date())))
            .orderBy(desc(images.createdAt));

        const data = rows.map((r) => ({
            id: r.id,
            kind: "image" as const,
            url: getImagePublicUrl(r.storagePath),
            prompt: r.prompt,
            style: r.style,
            model: r.model,
            type: r.type,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
        }));

        return res.status(200).json({
            message:"Images fetched successfully",
            statusCode:200,
            data,
        })
    } catch (err) {
        log("error", "Failed to fetch image history", err);
        return res.status(500).json({
            message:"Error while geting the images",
            statusCode:500,
            error:err
        });
    }
})

// ── DELETE /image/:id ────────────────────────────────────────────────────────
// Remove the user's image from the storage bucket and the database. Scoped to
// the authenticated user so one user can't delete another's images.
app.delete('/:id', authMiddleware, async (req, res) => {
    const parsed = z.uuid().safeParse(req.params.id);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid image id", statusCode: 400 });
    }
    const id = parsed.data;

    try {
        const [row] = await db
            .select()
            .from(images)
            .where(and(eq(images.id, id), eq(images.userId, req.userId)));

        if (!row) {
            return res.status(404).json({ message: "Image not found", statusCode: 404 });
        }

        const { success, error } = await deleteImages([row.storagePath]);
        if (!success) {
            log("error", "Failed to delete image from bucket", error);
            return res.status(500).json({ message: "Failed to delete image", statusCode: 500 });
        }

        await db.delete(images).where(eq(images.id, id));

        return res.status(200).json({ message: "Image deleted successfully", statusCode: 200, id });
    } catch (err) {
        log("error", "Failed to delete image", err);
        return res.status(500).json({ message: "Error while deleting the image", statusCode: 500, error: err });
    }
})

export { app };
