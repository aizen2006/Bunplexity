import type { StorageApiError } from "@supabase/supabase-js";
import { supabase } from "./client";

export interface imageUploadTypes{
    uploadStatus:boolean
    error: StorageApiError | null
    statusCode:number
} 

export default async function uploadImage(file:Buffer){
    // 10 MB = 10485760 bytes
    
    if(file.length > 10485760){
        return {
            uploadStatus:false,
            error:"File is Bigger than 10 mb, upload a file with lower size ",
            statusCode:400
        }
    }
    const filePath = `${crypto.randomUUID().toString()}`;

    const { data, error } = await supabase
    .storage
    .from('Bunplexity-Images')
    .upload(filePath,file);

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