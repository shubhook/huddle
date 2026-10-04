import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createHash } from "node:crypto";
import { incrementCounter } from "../socket/bus";
import { env } from "./env";

interface Bucket {
    count: number;
    resetAt: number;
}

/** Used when Redis is not configured or is down. Each API process then counts on its own. */
const memory = new Map<string, Bucket>();

const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memory) {
        if (bucket.resetAt <= now) memory.delete(key);
    }
}, 60_000);
sweep.unref();

async function hit(key: string, windowMs: number): Promise<{ count: number; retryAfterMs: number }> {
    const shared = await incrementCounter(`huddle:rl:${key}`, windowMs);
    if (shared) return { count: shared.count, retryAfterMs: shared.ttlMs };

    const now = Date.now();
    let bucket = memory.get(key);
    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        memory.set(key, bucket);
    }
    bucket.count += 1;
    return { count: bucket.count, retryAfterMs: bucket.resetAt - now };
}

/** Keys end up in Redis and logs, so never put an email in them as plain text. */
export const fingerprint = (value: string) =>
    createHash("sha256").update(value).digest("hex").slice(0, 16);

export interface RateLimitRule {
    /** Groups counters, for example "signin-ip". */
    name: string;
    windowMs: number;
    max: number;
    /** Who the limit applies to. Return null to skip the rule for this request. */
    key: (req: Request) => string | null;
}

/**
 * Counts requests per key and answers 429 with Retry-After once a rule is exceeded.
 * Several rules can guard one route, such as per IP and per target account.
 * Failed and successful requests both count. The windows are short and the caps leave
 * room for normal use, so there is no per-outcome bookkeeping to get wrong.
 */
export function rateLimit(...rules: RateLimitRule[]): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (env.rateLimitDisabled) return next();

        try {
            for (const rule of rules) {
                const who = rule.key(req);
                if (who === null) continue;

                const { count, retryAfterMs } = await hit(`${rule.name}:${who}`, rule.windowMs);

                if (count > rule.max) {
                    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
                    res.setHeader("Retry-After", String(seconds));
                    res.status(429).json({
                        message: `Too many attempts. Try again in ${formatWait(seconds)}.`,
                    });
                    return;
                }
            }
        } catch (err) {
            // A broken limiter must not lock everyone out. Log it and let the request through.
            console.error("rate limiter failed", err);
        }

        next();
    };
}

function formatWait(seconds: number): string {
    if (seconds < 90) return `${seconds} seconds`;
    return `${Math.ceil(seconds / 60)} minutes`;
}

export const byIp = (req: Request) => req.ip ?? "unknown";
export const byUser = (req: Request) => req.userId ?? null;

/** Lowercased email from the body, hashed. Skips the rule when the body has no usable email. */
export const byBodyEmail = (req: Request) => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    if (typeof email !== "string" || email.trim() === "") return null;
    return fingerprint(email.trim().toLowerCase());
};

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
