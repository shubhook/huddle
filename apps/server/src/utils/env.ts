import "dotenv/config"

export function readRequiredEnv(handle: string): string {
    const value = process.env[handle];
    if(!value) throw Error(`Missing required env: ${handle}`);
    return value;
};

export const env = {

    PORT: process.env.PORT || "3000",
    JwtSecret: readRequiredEnv("JWT_SECRET"),
    githubClientId: readRequiredEnv("CLIENT_ID"),
    githubSecret: readRequiredEnv("CLIENT_SECRET"),
    githubRedirectUri: readRequiredEnv("GITHUB_REDIRECT_URI"),
}

