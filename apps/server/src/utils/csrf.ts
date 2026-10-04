import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "./origin";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function originOfReferer(referer: string): string {
    try {
        return new URL(referer).origin;
    } catch {
        return "invalid";
    }
}

/**
 * Refuses state-changing requests that a browser sent from a site outside CLIENT_ORIGIN.
 *
 * With COOKIE_SECURE=true the login cookie is SameSite=None, so the browser attaches it
 * to requests started by any website. CORS does not help: it only hides the response,
 * after the server has already acted. A plain HTML form on another site could make a
 * signed-in user join a workspace or revoke all their sessions.
 *
 * Browsers put an Origin header on every cross-site POST, and page scripts cannot change
 * it. Referer is the fallback for the rare request without one. A request with neither
 * comes from a non-browser client (curl, scripts). Those still need a valid session
 * cookie, and an attacker's page cannot make a browser send a request that way.
 */
export function rejectCrossSiteWrites(req: Request, res: Response, next: NextFunction) {
    if (!STATE_CHANGING.has(req.method)) return next();

    const origin = req.get("origin");
    const referer = req.get("referer");
    const source = origin ?? (referer ? originOfReferer(referer) : undefined);

    if (source === undefined) return next();

    // "null" is what sandboxed iframes and some redirects send. Never trust it.
    if (source !== "null" && isAllowedOrigin(source)) return next();

    console.warn(`Blocked cross-site ${req.method} ${req.path} from ${JSON.stringify(source.slice(0, 200))}`);
    res.status(403).json({
        message: "This request came from a site that is not allowed to make changes here.",
    });
}
