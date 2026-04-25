import express from "express";

const app = express()
app.use(express.json());

app.post("/chat",async (req,res)=>{
    // Step 1 - get the quesry from the user

    // Step 2 - make sure user has access or credits to hit the endpoint 

    // Step 3 - check if we have webserach indexed  for a Similar query

    // Step 4 - web search to gather resources 
    
    // Step 5 - do some context engineering on the prompt + web search responses

    // Step 6 - Hit the LLM and stream back the response 

    // Step 7 - Also stream back the sources and followup questions

    // Step 8 - close the event stream
    }
);
app.listen(3000,()=>{
    console.log("Server is running on port 3000");
});