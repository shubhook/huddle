export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface ChatMessage {
  id: string;
  sender: string;
  channel: string;
  /** ISO time from the server. Used to order messages that arrive by different routes. */
  createdAt: string;
  content: string;
}
