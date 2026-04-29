import type { Request , Response , NextFunction } from "express";
import { supabase } from "./lib/client";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map<string, number[]>();

export async function authMiddleware(req: Request , res: Response , next: NextFunction) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
        return res.status(401).json({ error: error.message });
    }
    const userId = data.user?.id;
    if (!userId) {
        return res.status(403).json({ error: "Incorrect Inputs" });
    }
    (req as any).userId = userId;
    next();
}

export function fail(
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: unknown
) {
    return res.status(status).json({
        code,
        message,
        details,
        requestId: res.locals.requestId,
    });
}

export function chatRateLimit(req: Request, res: Response, next: NextFunction) {
    const key = `${req.userId}:${req.path}`;
    const now = Date.now();
    const timestamps = rateLimitStore.get(key) ?? [];
    const withinWindow = timestamps.filter((t) => now - t <= RATE_LIMIT_WINDOW_MS);
    if (withinWindow.length >= RATE_LIMIT_MAX) {
        return fail(res, 429, "RATE_LIMITED", "Too many requests. Please retry later.");
    }
    withinWindow.push(now);
    rateLimitStore.set(key, withinWindow);
    next();
}