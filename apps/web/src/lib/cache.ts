import type { CurrentUser, WorkspaceSummary } from "@/lib/api";
import type { ChatMessage } from "@/types";

/**
 * The last state the app saw, kept in localStorage so a reload can paint it
 * straight away while the server is asked for fresh data. Everything here is
 * a hint: the server's answer always replaces it, and signing out clears it.
 *
 * Bump the version when a stored shape changes, so old entries are ignored.
 */
const PREFIX = "huddle.cache.v1.";
const USER_KEY = `${PREFIX}user`;
const WORKSPACES_KEY = `${PREFIX}workspaces`;
const workspaceKey = (workspaceId: string) => `${PREFIX}workspace.${workspaceId}`;

/** Newest messages kept per channel. Matches one page of history from the server. */
const MESSAGES_PER_CHANNEL = 50;

export interface WorkspaceSnapshot {
  name: string;
  memberCount: number | null;
  channels: { id: string; name: string }[];
  activeChannelId: string | null;
  messages: ChatMessage[];
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode, storage disabled or full: the app works, it just loads cold next time.
  }
}

export function cachedUser(): CurrentUser | null {
  return read<CurrentUser>(USER_KEY);
}

/** Stores the signed-in user. A different user than before drops the previous user's data. */
export function cacheUser(user: CurrentUser) {
  const previous = cachedUser();
  if (previous && previous.id !== user.id) clearCache();
  write(USER_KEY, user);
}

export function cachedWorkspaces(): WorkspaceSummary[] {
  return read<WorkspaceSummary[]>(WORKSPACES_KEY) ?? [];
}

export function cacheWorkspaces(workspaces: WorkspaceSummary[]) {
  write(WORKSPACES_KEY, workspaces);
}

export function cachedWorkspace(workspaceId: string): WorkspaceSnapshot | null {
  return read<WorkspaceSnapshot>(workspaceKey(workspaceId));
}

export function cacheWorkspace(workspaceId: string, snapshot: WorkspaceSnapshot) {
  const kept = new Map<string, number>();
  // Messages are sorted oldest first, so walk backwards to keep the newest of each channel.
  const messages = [...snapshot.messages]
    .reverse()
    .filter((message) => {
      const count = kept.get(message.channel) ?? 0;
      kept.set(message.channel, count + 1);
      return count < MESSAGES_PER_CHANNEL;
    })
    .reverse();
  write(workspaceKey(workspaceId), { ...snapshot, messages });
}

/** Removes everything cached for the signed-in user. Called on sign-out and when the session ends. */
export function clearCache() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Storage disabled: nothing was cached.
  }
}
