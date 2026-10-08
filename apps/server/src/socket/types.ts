import { WebSocket } from "ws"

export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    /** The Session this socket authenticated under. Revoking the session closes the socket. */
    sessionId: string;
    /** Cleared on each ping, set again by the pong. Still false at the next ping means the peer is gone. */
    isAlive: boolean;
    /** Frames from one socket run one at a time, so a join and a leave cannot overtake each other. */
    queue: Promise<void>;
    /** Frames waiting in queue. */
    pending: number;
    expiryTimer?: ReturnType<typeof setTimeout>;
}
