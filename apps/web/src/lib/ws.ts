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

  const wsUrl = API_URL.replace(/^http/, "ws");
  setStatus("connecting");
  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => setStatus("connected"));

  socket.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(event.data) as IncomingMessage;
      messageListeners.forEach((listener) => listener(parsed));
    } catch {
      // ignore malformed frames
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    setStatus("disconnected");
  });

  socket.addEventListener("error", () => {
    setStatus("disconnected");
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
