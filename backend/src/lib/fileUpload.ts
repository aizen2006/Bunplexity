import type { StorageApiError } from "@supabase/supabase-js";
import { supabase } from "./client";

export const IMAGE_BUCKET = "Bunplexity-Images";

export interface imageUploadTypes{
    uploadStatus:boolean
    error: StorageApiError | null
    statusCode:number
}

/** Public URL for an object stored in the image bucket (bucket must be public). */
export function getImagePublicUrl(path: string): string {
    return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export default async function uploadImage(file:Buffer, contentType?: string, ext?: string){
    // 10 MB = 10485760 bytes

    if(file.length > 10485760){
        return {
            uploadStatus:false,
            error:"File is Bigger than 10 mb, upload a file with lower size ",
            statusCode:400
        }
    }
    // Include the file extension so the object is served with an image
    // Content-Type. Without a contentType (or inferable extension) Supabase
    // stores objects as `text/plain` + `nosniff`, which browsers refuse to
    // render in <img>, making the public URL appear broken.
    const filePath = ext ? `${crypto.randomUUID().toString()}.${ext}` : `${crypto.randomUUID().toString()}`;

    const { data, error } = await supabase
    .storage
    .from(IMAGE_BUCKET)
    .upload(filePath, file, contentType ? { contentType } : undefined);

    if(error){
        return {
            uploadStatus:false,
            error:error,
            statusCode:500
        }
    }else{
        return {
            uploadStatus:true,
            data:data,
            statusCode:200
        }
    }
}