import "dotenv/config"

export function readRequiredEnv(handle: string): string {
    const value = process.env[handle];
    if (!value) throw Error(`Missing required env: ${handle}`);
    return value;
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

export const env = {
    PORT: Number(process.env.PORT) || 3000,
    JwtSecret: readRequiredEnv("JWT_SECRET"),
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
    /** Optional. When set, realtime events fan out through Redis so several API processes can share channels. */
    redisUrl: process.env.REDIS_URL || undefined,
    /** Ping interval. A socket that misses one full interval without a pong is terminated. */
    wsHeartbeatMs: Number(process.env.WS_HEARTBEAT_MS) || 30_000,
    /** How often subscribed users are re-checked against channel membership. */
    wsMembershipRecheckMs: Number(process.env.WS_MEMBERSHIP_RECHECK_MS) || 60_000,
};
