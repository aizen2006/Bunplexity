import { Router } from "express";
import { uploadMiddleware , authMiddleware } from "../middleware";
import { processFile } from "../lib/fileprocesser";


const app = Router();

// Later add ratelimiting

app.post('/upload',authMiddleware,uploadMiddleware.array('docs',5),async(req,res) => {
    const files = req.files as Express.Multer.File[];

    if (files.length === 0) {
        return res.status(400).json({
            message: "No files uploaded.",
            statusCode: 400
        });
    }
    let file_content:string="";
    for (const file of files) {
        file_content += (await processFile(file.buffer, file.originalname, file.mimetype)).text;
    }
    res.status(200).json({
        message:"The files parsed Successfully",
        statusCode:200,
        file_content
    })
})

export { app };