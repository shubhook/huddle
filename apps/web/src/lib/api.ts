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

export async function sendMessage(channelId: string, content: string) {
    const res = await axios.post(
      `${API_URL}/channels/${channelId}/messages`,
      { content },
      { withCredentials: true }
    );
    return res.data;
  }

  export interface WorkspaceDetails {
    general: {
      id: string;
      name: string;
      createdAt: string;
    };
    channels: {
      id: string;
      name: string;
      workspaceId: string;
    }[];
    members: {
      id: string;
      userId: string;
      workspaceId: string;
      role: string;
    }[];
  }
  
  export async function getWorkspace(workspaceId: string): Promise<WorkspaceDetails> {
    const res = await axios.get(
      `${API_URL}/workspaces/${workspaceId}`,
      { withCredentials: true }
    );
    return res.data.workspaceDetails;
  }