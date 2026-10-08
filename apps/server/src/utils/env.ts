import "dotenv/config"

export function readRequiredEnv(handle: string): string {
    const value = process.env[handle];
    if (!value) throw Error(`Missing required env: ${handle}`);
    return value;
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * A short or copied-from-the-docs secret lets anyone forge tokens offline.
 * Production refuses to boot with one. Development only warns, so a fresh clone still runs.
 */
const PLACEHOLDER_SECRET = /change-?me|replace-?me|your[-_ ]?secret|example/i;

function checkJwtSecret(secret: string) {
    if (secret.length >= 32 && !PLACEHOLDER_SECRET.test(secret)) return;

    const message =
        "JWT_SECRET is too weak. Use 32 or more random characters and not the example value. " +
        "Generate one with: openssl rand -base64 48";

    if (isProduction) throw new Error(message);
    console.warn(`WARNING: ${message}`);
}

/**
 * Express uses this to decide whose X-Forwarded-For to believe, and rate limits key on the result.
 * Behind a reverse proxy set a hop count such as 1. "true" is refused because it trusts any
 * client-supplied header and lets an attacker pick their own IP.
 */
function parseTrustProxy(raw: string | undefined): boolean | number | string {
    if (!raw) return false;
    if (/^\d+$/.test(raw)) return Number(raw);
    if (raw.toLowerCase() === "true") {
        console.warn('TRUST_PROXY=true ignored: it trusts any client-supplied X-Forwarded-For. Use a hop count such as "1".');
        return false;
    }
    return raw;
}

const githubClientId = process.env.CLIENT_ID ?? "";
const githubSecret = process.env.CLIENT_SECRET ?? "";
const githubRedirectUri =
    process.env.GITHUB_REDIRECT_URI ??
    "http://localhost:3000/auth/github/callback";

/** Email/password auth works without GitHub OAuth env. */
export const isGithubOAuthConfigured = Boolean(
    githubClientId && githubSecret,
);

const jwtSecret = readRequiredEnv("JWT_SECRET");
checkJwtSecret(jwtSecret);

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";
if (rateLimitDisabled) {
    console.warn("WARNING: RATE_LIMIT_DISABLED=true. Login, signup, invites and message sends are not rate limited. Never use this in production.");
}

export const env = {
    PORT: Number(process.env.PORT) || 3000,
    isProduction,
    JwtSecret: jwtSecret,
    /** Comma-separated origins for credentialed CORS (web on :3008). */
    clientOrigins: (
        process.env.CLIENT_ORIGIN ??
        "http://localhost:3008,http://127.0.0.1:3008"
    )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    githubClientId,
    githubSecret,
    githubRedirectUri,
    databaseUrl: readRequiredEnv("DATABASE_URL"),
    cookieSecure: process.env.COOKIE_SECURE === "true",
    /**
     * Optional. When set, realtime events fan out through Redis so several API
     * processes can share channels. Read at bus startup rather than import, so
     * a test can point it at a closed port after this module has loaded.
     */
    get redisUrl(): string | undefined {
        return process.env.REDIS_URL || undefined;
    },
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    /** For tests and local load runs only. */
    rateLimitDisabled,
    /** Ping interval. A socket that misses one full interval without a pong is terminated. */
    wsHeartbeatMs: Number(process.env.WS_HEARTBEAT_MS) || 30_000,
    /** How often subscribed users are re-checked against channel membership. */
    wsMembershipRecheckMs: Number(process.env.WS_MEMBERSHIP_RECHECK_MS) || 60_000,
};
