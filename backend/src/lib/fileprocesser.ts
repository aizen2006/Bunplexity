import crypto from 'crypto';
import { PDFParse as pdf } from 'pdf-parse'; 
import mammoth from 'mammoth';

export async function processFile(
    buffer: Buffer, 
    name: string, 
    mime: string
) {
    let text: string = "";
    let truncated: boolean = false;
    // Normalize strings for safer matching
    const normalizedMime = mime.toLowerCase();
    const fileExtension = name.split('.').pop()?.toLowerCase() ?? '';

    try {
        // 1. Handle PDF Processing
        if (normalizedMime === 'application/pdf' || fileExtension === 'pdf') {
            const parsedData = (await new pdf({data:buffer}).getText());
            text = parsedData.text;
            } 
        
        // 2. Handle DOCX Processing 
        else if (
            normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
            fileExtension === 'docx'
        ) {
            const result = await mammoth.extractRawText({ buffer: buffer });
            text = result.value;
        } 
        
        // 3. Handle Plain Text, CSV, and Markdown Processing
        else if (
            normalizedMime === 'text/csv' || 
            normalizedMime === 'text/plain' || 
            ['csv', 'txt', 'md'].includes(fileExtension)
        ) {
            text = buffer.toString("utf-8");
        } 
        
        // Fallback if file type isn't supported
        else {
            throw new Error(`Unsupported file type: ${mime}`);
        }

        // 4. Handle Truncation Guardrail (30,000 characters maximum)
        const originalCharCount = text.length;
        
        if (originalCharCount > 30_000) {
            text = text.slice(0, 30_000);
            truncated = true;
        }
        return { 
            fileId: crypto.randomUUID().toString(), 
            name, 
            text, 
            truncated, 
            charCount: text.length // Reflects the actual processed string length
        };
    } catch (error: any) {
        console.error(`[Parsing Error] Failed to process file ${name}:`, error.message);
        throw new Error(`File extraction failed: ${error.message}`);
    }
}

export interface fileTypes{
    fileId: string 
    name:string 
    text:string
    truncated:boolean
    charCount:number
}