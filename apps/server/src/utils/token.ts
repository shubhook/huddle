import jwt from "jsonwebtoken";
import { env } from "./env";

/** `sid` is the id of the Session row. A token whose session is revoked or gone is dead. */
export type tokenPayload = {
    userId: string
    sid: string
}

/** Seconds. The Session row expires at the same time as the token. */
export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Tokens issued before sessions existed have no sid, so every field is optional on the way in. */
export type VerifiedToken = Partial<tokenPayload> & { exp?: number };

export function signToken(payload: tokenPayload): string {
    return jwt.sign(payload, env.JwtSecret, {
        algorithm: "HS256",
        expiresIn: TOKEN_TTL_SECONDS,
    });
}

/** Checks the signature and expiry only. Whether the session is still active is findActiveSession's job. */
export function verifyToken(token: string, options: { ignoreExpiration?: boolean } = {}): VerifiedToken {
    const decoded = jwt.verify(token, env.JwtSecret, {
        algorithms: ["HS256"],
        ...options,
    });

    if (typeof decoded === "string") {
        throw new jwt.JsonWebTokenError("Unexpected token payload");
    }

    return decoded as VerifiedToken;
}

export const isTokenError = (err: unknown): boolean => err instanceof jwt.JsonWebTokenError;
