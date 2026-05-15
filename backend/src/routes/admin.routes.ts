import express from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from 'zod';

// these route are just for testing purposes

const app = express.Router();
const userSchema = z.object({
    id:z.string().describe("its a uuid"),
    name:z.string(),
    email:z.string(),
    provider:z.enum(["google", "github", "email"])
})


// user crud routes
app.post('/user', async( req , res ) => {   
    const user = userSchema.safeParse(req.body);
    if (!user.success) {
        return res.status(400).json({ error: "Invalid input", details: user.error.flatten() });
    }
    const { id , name , email , provider } = user.data;
    if(!id || !email || !provider) return res.status(400).json(" Incomplete details ");

    try {
        await db.insert(users).values({ id , name , email , provider})
        return res.status(200).json({
            message:"User Registered successfully"
        })
    } catch (error) {
        return res.status(500).json({
            message:`Failed to insert the user due to : ${error} `
        })
    } 
});
app.delete('/user',async( req , res ) => {
    const user = userSchema.safeParse(req.body);
    if (!user.success) {
        return res.status(400).json({ error: "Invalid input", details: user.error.flatten() });
    }
    const { email } = user.data;
    try {
        await db.delete(users).where(eq(users.email,email));
        return res.status(200).json({
            message:`Successfully Deleted the Users`
        });
    } catch (error) {
        return res.status(500).json({
            message:`Failed to delete the user due to ${error}`
        })
    }

});
app.patch('/user',async( req , res ) => {
    const user = userSchema.safeParse(req.body);
    if (!user.success) {
        return res.status(400).json({ error: "Invalid input", details: user.error.flatten() });
    }
    const { name , email } = user.data;
    try {
        await db.update(users).set({ name : name }).where(eq(users.email,email));
        return res.status(200).json({
            message:`Successfully updated the name of the Users`
        });
    } catch (error) {
        return res.status(500).json({
            message:`Failed to update the name of the user due to ${error}`
        })
    }
});

// credit crud routes
{/*  credit system will*/}



export { app };