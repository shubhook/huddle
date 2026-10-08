import axios from "axios";

import { API_URL, getCurrentUser } from "./api";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface NewMessageEvent {
  id: string;
  channelId: string;
  senderId: string;
  senderUsername: string;
  senderAvatarId: string | null;
  content: string;
  /** Set when the sender supplied one, so their other tabs can settle a pending copy. */
  clientMessageId: string | null;
  createdAt: string;
}

export type IncomingMessage =
  | { type: "new_message"; payload: NewMessageEvent }
  | { type: "join_channel_ack"; message: string; channelId: string }
  | { type: "leave_channel_ack"; channelId?: string; message?: string }
  | {
      type: "send_message_ack";
      channelId: string;
      messageId: string;
      clientMessageId?: string;
    }
  /** Sent once per connection: the socket now receives every one of these channels. */
  | { type: "subscribed"; channelIds: string[] }
  /** The user joined more channels while connected, and the socket receives them too. */
  | { type: "channels_added"; channelIds: string[] }
  | { type: "removed_from_channel"; channelId: string }
  | { type: "channel_deleted"; channelId: string }
  | {
      type: "error";
      code?: string;
      message: string;
      clientMessageId?: string;
      retryAfterSeconds?: number;
    };

type MessageListener = (message: IncomingMessage) => void;
type StatusListener = (status: ConnectionStatus) => void;
type SessionListener = () => void;

/** The server sends this close code when the session ended, so retrying cannot help. */
const CLOSE_SESSION_ENDED = 4401;

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 15_000;

let socket: WebSocket | null = null;
let status: ConnectionStatus = "disconnected";
/** True from connectSocket() until disconnectSocket(). Decides whether a closed socket is retried. */
let shouldReconnect = false;
let attempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let sessionCheckRunning = false;

const messageListeners = new Set<MessageListener>();
const statusListeners = new Set<StatusListener>();
const sessionListeners = new Set<SessionListener>();

function setStatus(next: ConnectionStatus) {
  status = next;
  statusListeners.forEach((listener) => listener(status));
}

function send(type: string, payload: Record<string, unknown>): boolean {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type, payload }));
  return true;
}

/** Prefer BUN_PUBLIC_WS_URL; otherwise derive ws(s) from API_URL. */
export function getWsUrl(): string {
  // Bun inlines process.env.BUN_PUBLIC_* only when the variable is set. When it
  // is unset the reference survives into the bundle and `process` does not
  // exist in the browser, so a bare read throws and takes the dashboard down.
  let configured: string | undefined;
  try {
    configured = process.env.BUN_PUBLIC_WS_URL;
  } catch {
    configured = undefined;
  }
  const fromEnv = configured?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return API_URL.replace(/^http/, "ws");
}

export function getConnectionStatus(): ConnectionStatus {
  return status;
}

export function onStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function onMessage(listener: MessageListener): () => void {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}

/** Fires when the server says the session is over, or a reconnect finds the cookie no longer valid. */
export function onSessionEnded(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function endSession() {
  shouldReconnect = false;
  clearReconnectTimer();
  setStatus("disconnected");
  sessionListeners.forEach((listener) => listener());
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/** A refused upgrade looks the same as a network failure (close code 1006), so ask the API. */
async function verifySession() {
  if (sessionCheckRunning) return;
  sessionCheckRunning = true;
  try {
    await getCurrentUser();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      endSession();
    }
  } finally {
    sessionCheckRunning = false;
  }
}

/** Exponential backoff, randomised over the upper half so clients do not retry in step. */
function scheduleReconnect() {
  if (!shouldReconnect || reconnectTimer) return;

  const ceiling = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
  const delay = ceiling / 2 + Math.random() * (ceiling / 2);
  attempt += 1;

  if (attempt % 3 === 0) void verifySession();

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openSocket();
  }, delay);
}

function openSocket() {
  setStatus("connecting");
  // Browser sends jwt_token cookie for the API host on upgrade (same as REST).
  const ws = new WebSocket(getWsUrl());
  socket = ws;

  // A replaced socket still fires close/error later (React StrictMode runs
  // connect, disconnect, connect). Those events must not touch the new socket.
  const isCurrent = () => socket === ws;

  ws.addEventListener("open", () => {
    if (!isCurrent()) return;
    attempt = 0;
    setStatus("connected");
  });

  ws.addEventListener("message", (event) => {
    if (!isCurrent()) return;
    try {
      const parsed = JSON.parse(event.data) as IncomingMessage;
      messageListeners.forEach((listener) => listener(parsed));
    } catch {
      // ignore malformed frames
    }
  });

  ws.addEventListener("close", (event) => {
    if (!isCurrent()) return;
    socket = null;

    if (event.code === CLOSE_SESSION_ENDED) {
      endSession();
      return;
    }

    if (shouldReconnect) {
      // Still trying, so the badge says so instead of claiming a settled state.
      setStatus("connecting");
      scheduleReconnect();
    } else {
      setStatus("disconnected");
    }
  });
}

export function connectSocket(): void {
  shouldReconnect = true;

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  clearReconnectTimer();
  openSocket();
}

export function disconnectSocket(): void {
  shouldReconnect = false;
  clearReconnectTimer();
  attempt = 0;
  socket?.close();
  socket = null;
  setStatus("disconnected");
}

// Coming back online should not wait out the rest of a backoff delay.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (!shouldReconnect || socket) return;
    clearReconnectTimer();
    attempt = 0;
    openSocket();
  });
}

/** Returns false when the socket is not open, so the caller can keep the user's draft. */
export function joinChannel(channelId: string, workspaceId: string): boolean {
  return send("join_channel", { channelId, workspaceId });
}

export function leaveChannel(channelId: string): boolean {
  return send("leave_channel", { channelId });
}

/**
 * Returns the clientMessageId the server will echo in its ack or error,
 * or null when the socket is not open and nothing was sent.
 *
 * Pass the id of an earlier send to retry it. The server saves a message once per id,
 * so a retry after a lost ack gets the saved one back instead of a duplicate.
 */
export function sendChannelMessage(
  channelId: string,
  workspaceId: string,
  content: string,
  retryOf?: string,
): string | null {
  // randomUUID exists only in secure contexts (https or localhost).
  const clientMessageId =
    retryOf ??
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const sent = send("send_message", {
    channelId,
    workspaceId,
    content,
    clientMessageId,
  });
  return sent ? clientMessageId : null;
}
