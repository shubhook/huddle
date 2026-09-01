import axios from "axios"

export const API_URL = process.env.BUN_PUBLIC_API_URL ?? "http://localhost:3000";

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

export async function signup(username: string, email: string, password: string) {
    const res = await axios.post(`${API_URL}/auth/signup`, {
        username: username,
        email: email,
        password: password
    }, { withCredentials: true })

    return res.data;
}

export async function createWorkspace(name: string): Promise<{ workspaceId: string }> {
    const res = await axios.post(
      `${API_URL}/workspaces`,
      { name },
      { withCredentials: true }
    );
    return res.data;
}

export async function createInvite(workspaceId: string): Promise<{ token: string }> {
    const res = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/invite`,
      {},
      { withCredentials: true }
    );
    return res.data;
}

export async function joinWorkspace(inviteCode: string): Promise<{ workspaceId: string }> {
    const token = inviteCode.split("/").filter(Boolean).pop() ?? inviteCode;
    const res = await axios.post(
      `${API_URL}/workspaces/join/${token}`,
      {},
      { withCredentials: true }
    );
    return res.data;
}

export async function sendMessage(channelId: string, content: string) {
    const res = await axios.post(
      `${API_URL}/channel/${channelId}/messages`,
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
  
  export interface CurrentUser {
    id: string;
    username: string;
    email: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
    const res = await axios.get(`${API_URL}/auth/me`, { withCredentials: true });
    return res.data.user;
}

export async function logout(): Promise<void> {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
}

export interface ChannelMessage {
    id: string;
    content: string;
    senderId: string;
    channelId: string;
    createdAt: string;
    sender: { username: string };
}

export async function getMessages(channelId: string): Promise<ChannelMessage[]> {
    const res = await axios.get(
      `${API_URL}/channels/${channelId}/messages`,
      { withCredentials: true }
    );
    return res.data.batchMessage;
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceDetails> {
    const res = await axios.get(
      `${API_URL}/workspaces/${workspaceId}`,
      { withCredentials: true }
    );
    return res.data.workspaceDetails;
  }