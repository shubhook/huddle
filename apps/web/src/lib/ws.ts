import { API_URL } from "./api";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface NewMessageEvent {
  id: string;
  channelId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
}

export type IncomingMessage =
  | { type: "new_message"; payload: NewMessageEvent }
  | { type: "join_channel_ack"; message: string; channelId: string }
  | { type: "leave_channel_ack"; message: string }
  | { type: "error"; message: string };

type MessageListener = (message: IncomingMessage) => void;
type StatusListener = (status: ConnectionStatus) => void;

let socket: WebSocket | null = null;
let status: ConnectionStatus = "disconnected";
const messageListeners = new Set<MessageListener>();
const statusListeners = new Set<StatusListener>();

function setStatus(next: ConnectionStatus) {
  status = next;
  statusListeners.forEach((listener) => listener(status));
}

function send(type: string, payload: Record<string, unknown>) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
  }
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

export function connectSocket(): void {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const wsUrl = getWsUrl();
  setStatus("connecting");
  // Browser sends jwt_token cookie for the API host on upgrade (same as REST).
  const ws = new WebSocket(wsUrl);
  socket = ws;

  // A replaced socket still fires close/error later (React StrictMode runs
  // connect, disconnect, connect). Those events must not touch the new socket.
  const isCurrent = () => socket === ws;

  ws.addEventListener("open", () => {
    if (isCurrent()) setStatus("connected");
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

  ws.addEventListener("close", () => {
    if (!isCurrent()) return;
    socket = null;
    setStatus("disconnected");
  });

  ws.addEventListener("error", () => {
    if (isCurrent()) setStatus("disconnected");
  });
}

export function disconnectSocket(): void {
  socket?.close();
  socket = null;
  setStatus("disconnected");
}

export function joinChannel(channelId: string, workspaceId: string): void {
  send("join_channel", { channelId, workspaceId });
}

export function leaveChannel(channelId: string): void {
  send("leave_channel", { channelId });
}

export function sendChannelMessage(
  channelId: string,
  workspaceId: string,
  content: string,
): void {
  send("send_message", { channelId, workspaceId, content });
}
