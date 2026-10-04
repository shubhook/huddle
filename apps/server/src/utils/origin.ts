import { env } from "./env";

/** Browsers send "https://app.example.com". Config may carry a trailing slash or capitals. */
export const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "").toLowerCase();

// CLIENT_ORIGIN, the same list CORS uses. REST writes and the websocket check against it too.
const allowedOrigins = new Set(env.clientOrigins.map(normalizeOrigin));

export function isAllowedOrigin(origin: string): boolean {
    return allowedOrigins.has(normalizeOrigin(origin));
}
