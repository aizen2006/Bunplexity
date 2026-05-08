import express from "express";
import cors from "cors";
import { app as user } from "./routes/user.route";
import { app as chat } from "./routes/chat.route";
import { db } from "./db/index";
import { users} from "./db/schema";

const app = express();

app.use(express.json());
app.use(cors());

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
        return Error("Backend service Not Ready");
    }
});

app.use(user);
app.use(chat);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
// app.get("/credits", authMiddleware, async (req, res) => {
//     const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, req.userId)).limit(1);
//     if (!user) {
//         return fail(res, 404, "USER_NOT_FOUND", "User not found.");
//     }
//     return res.status(200).json({ credits: user.credits });
// });

// app.post("/credits/consume", authMiddleware, async (req, res) => {
//     const parsed = creditsConsumeBodySchema.safeParse(req.body);
//     if (!parsed.success) {
//         return fail(res, 400, "VALIDATION_ERROR", "Invalid credits consume body.", parsed.error.flatten());
//     }

//     const { amount } = parsed.data;
//     const [updated] = await db.update(users)
//         .set({ credits: sql`${users.credits} - ${amount}` })
//         .where(and(eq(users.id, req.userId), gt(users.credits, amount - 1)))
//         .returning({ credits: users.credits });

//     if (!updated) {
//         return fail(res, 403, "INSUFFICIENT_CREDITS", "Insufficient credits.");
//     }

//     return res.status(200).json({ credits: updated.credits });
// });

