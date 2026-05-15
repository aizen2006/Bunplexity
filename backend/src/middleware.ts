import type { Request, Response, NextFunction } from "express";
import { supabase } from "./lib/client";
import { db } from "./db/index";
import { users } from "./db/schema";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map<string, number[]>();
const syncedUsers = new Set<string>();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const raw = req.headers.authorization;
    const token = raw?.replace(/^Bearer\s+/i, '');
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

    if (!syncedUsers.has(userId)) {
        const supabaseUser = data.user;
        const rawProvider = supabaseUser.app_metadata?.provider ?? 'email';
        const provider = (['google', 'github', 'email'] as const).includes(rawProvider as any)
            ? (rawProvider as 'google' | 'github' | 'email')
            : 'email';
        const name =
            supabaseUser.user_metadata?.full_name ??
            supabaseUser.user_metadata?.name ??
            supabaseUser.email?.split('@')[0] ??
            'User';

        await db.insert(users).values({
            id: userId,
            email: supabaseUser.email!,
            provider,
            name,
        }).onConflictDoNothing();

        syncedUsers.add(userId);
    }

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

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    const secret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
}
