import express from "express";
import cors from "cors";
import { app as user } from "./routes/user.route";
import { app as chat } from "./routes/chat.route";
import { app as admin } from "./routes/admin.routes";
import { adminMiddleware } from "./middleware";
import { db } from "./db/index";
import { users} from "./db/schema";

const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

app.get("/health", (_req, res) => {
    return res.status(200).json({
        status: "ok",
        service: "backend",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});

app.get("/ready", async (_req, res) => {
    try {
        await db.select({ id: users.id }).from(users).limit(1);
        return res.status(200).json({ status: "ready" });
    } catch (error) {
        return res.status(503).json({ error: "Backend service Not Ready" });
    }
});
app.use('/admin', adminMiddleware, admin);
app.use('/user',user);
app.use(chat);

const PORT = process.env.PORT || '3001';
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});