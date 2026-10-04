import type { NextFunction, Request, Response } from "express";
import { env } from "./env";

/**
 * Headers for an API that only ever returns JSON or a redirect.
 * The CSP blocks everything because nothing here should be rendered or framed.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    // Session lists, workspace members and messages must not sit in a shared cache.
    res.setHeader("Cache-Control", "no-store");

    // COOKIE_SECURE is the existing "this runs on HTTPS" switch.
    if (env.cookieSecure) {
        res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }

    next();
}
