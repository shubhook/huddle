import type { Response, CookieOptions } from "express";
import { env } from "./env";

export const AUTH_COOKIE = "jwt_token";

const authCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env.cookieSecure,
};

export function setAuthCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, authCookieOptions);
}

export function clearAuthCookie(res: Response) {
    res.clearCookie(AUTH_COOKIE, {
        path: "/",
        sameSite: "lax",
        secure: env.cookieSecure,
    });
}
