import { WebSocket } from "ws"

export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    /** SHA-256 of the JWT this socket authenticated with. Logout uses it to find sockets to close. */
    tokenHash: string;
    /** Cleared on each ping, set again by the pong. Still false at the next ping means the peer is gone. */
    isAlive: boolean;
    /** Frames from one socket run one at a time, so a join and a leave cannot overtake each other. */
    queue: Promise<void>;
    /** Frames waiting in queue. */
    pending: number;
    expiryTimer?: ReturnType<typeof setTimeout>;
}

/** Close code the client treats as "your session is gone, do not reconnect". */
export const CLOSE_SESSION_ENDED = 4401;
