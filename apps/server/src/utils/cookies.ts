import type { Response, CookieOptions } from "express";
import { env } from "./env";

export const AUTH_COOKIE = "jwt_token";

/**
 * Cross-site cookie policy.
 *
 * The web SPA and this API live on different origins, so the SPA reads/writes
 * auth via cross-origin credentialed requests, and GitHub OAuth sets the cookie
 * on a redirect that is cross-site. `SameSite=Lax` is not sent on cross-site
 * XHR, and Firefox's Total Cookie Protection partitions a Lax cookie set during
 * the OAuth redirect so the SPA never sees it (user bounces back to /signin).
 *
 * `SameSite=None` fixes both, but browsers only accept it with `Secure`, which
 * requires HTTPS. So over HTTPS (prod) we use `none`; on local HTTP we fall back
 * to `lax` (dev web + API are same-site on localhost, so Lax works there).
 */
export const crossSiteSameSite: CookieOptions["sameSite"] = env.cookieSecure
    ? "none"
    : "lax";

const authCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: crossSiteSameSite,
    path: "/",
    secure: env.cookieSecure,
};

export function setAuthCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, authCookieOptions);
}

export function clearAuthCookie(res: Response) {
    res.clearCookie(AUTH_COOKIE, {
        path: "/",
        sameSite: crossSiteSameSite,
        secure: env.cookieSecure,
    });
}
