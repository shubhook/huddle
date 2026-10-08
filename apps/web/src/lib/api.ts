import axios from "axios"

/** Unset BUN_PUBLIC_* vars are not inlined, so a bare read throws in the browser. */
function readApiUrlFromEnv(): string | undefined {
  try {
    return process.env.BUN_PUBLIC_API_URL;
  } catch {
    return undefined;
  }
}

/** API origin. Trailing slash stripped so WS and path joins stay correct. */
export const API_URL = (
  readApiUrlFromEnv() ?? "http://localhost:3000"
).replace(/\/$/, "");

axios.defaults.withCredentials = true;

/** Prefer server `message` from an Axios error response; otherwise fallback. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data?.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
}

/** True when the server refused the session, as opposed to being unreachable or failing. */
export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

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

export interface WorkspaceSummary {
    id: string;
    name: string;
    role: string;
}

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
    const res = await axios.get(`${API_URL}/workspaces`, { withCredentials: true });
    return res.data.workspaces;
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

export interface Channel {
    id: string;
    name: string;
    workspaceId: string;
}

export async function createChannel(
    workspaceId: string,
    name: string,
): Promise<Channel> {
    const res = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/channels`,
      { name },
      { withCredentials: true },
    );
    return res.data.data;
}

export interface ChannelMember {
    id: string;
    username: string;
    avatarId: string | null;
    /** Workspace role: "owner", "admin" or "member". */
    role: string;
}

export interface ChannelDetails {
    id: string;
    name: string;
    workspaceId: string;
    createdAt: string;
    members: ChannelMember[];
}

export async function getChannelDetails(channelId: string): Promise<ChannelDetails> {
    const res = await axios.get(`${API_URL}/channels/${channelId}`, { withCredentials: true });
    return res.data.data;
}

/** Owners and admins only. Members get a channel_deleted frame over the socket. */
export async function deleteChannel(channelId: string): Promise<void> {
    await axios.delete(`${API_URL}/channels/${channelId}`, { withCredentials: true });
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
    /** Changes on each upload. Null when the user has no picture. */
    avatarId: string | null;
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
    sender: { username: string; avatarId: string | null };
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

/** Where a user's picture is served. The avatar id makes the URL change on every upload. */
export function avatarUrl(userId: string, avatarId: string | null | undefined): string | undefined {
    if (!avatarId) return undefined;
    return `${API_URL}/users/${userId}/avatar?v=${encodeURIComponent(avatarId)}`;
}

export async function uploadAvatar(image: Blob): Promise<{ avatarId: string }> {
    const res = await axios.put(`${API_URL}/users/me/avatar`, image, {
        withCredentials: true,
        headers: { "Content-Type": image.type },
    });
    return res.data;
}

export async function removeAvatar(): Promise<void> {
    await axios.delete(`${API_URL}/users/me/avatar`, { withCredentials: true });
}
