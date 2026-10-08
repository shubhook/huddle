export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  /** The sender's picture when this copy was fetched. Null when they have none. */
  senderAvatarId: string | null;
  channel: string;
  /** ISO time from the server. Used to order messages that arrive by different routes. */
  createdAt: string;
  content: string;
}
