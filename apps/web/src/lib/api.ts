// import "dotenv/config"
import axios from "axios"

// export function readRequiredEnv(handle: string): string {
//     const value = process.env[handle];
//     if(!value) throw Error(`Missing required env: ${handle}`);
//     return value;
// };

// function apiBaseUrl(): string {
//     return readRequiredEnv("API_URL");
// }

const API_URL = "http://localhost:3000";

/** Full-page redirect URL for GitHub OAuth (server sets state cookie + redirects). */
export function getGithubAuthUrl(): string {
    return `${API_URL}/auth/github`;
}

export function startGithubLogin(): void {
    window.location.href = getGithubAuthUrl();
}

export async function signin(email: string, password: string) {
    const res = await axios.post(`${API_URL}/auth/signin`, {
        email: email,
        password: password
    }, { withCredentials: true })

    return res.data;
}