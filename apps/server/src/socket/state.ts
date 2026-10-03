import { WebSocket } from "ws";
import { CLOSE_SESSION_ENDED, type AuthenticatedWebSocket } from "./types";

export const channelSubscriptions = new Map<string, Set<AuthenticatedWebSocket>>();

/** Every open socket, subscribed to something or not. */
const connections = new Set<AuthenticatedWebSocket>();

export function registerSocket(ws: AuthenticatedWebSocket) {
    connections.add(ws);
}

export function sendFrame(ws: WebSocket, frame: Record<string, unknown>) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(frame));
    }
}

export function sendError(
    ws: WebSocket,
    code: string,
    message: string,
    extra: { clientMessageId?: string } = {},
) {
    sendFrame(ws, { type: "error", code, message, ...extra });
}

export function subscribe(channelId: string, ws: AuthenticatedWebSocket) {
    let subscribers = channelSubscriptions.get(channelId);
    if (!subscribers) {
        subscribers = new Set();
        channelSubscriptions.set(channelId, subscribers);
    }
    subscribers.add(ws);
}

export function unsubscribe(channelId: string, ws: AuthenticatedWebSocket) {
    const subscribers = channelSubscriptions.get(channelId);
    if (!subscribers) return;
    subscribers.delete(ws);
    if (subscribers.size === 0) channelSubscriptions.delete(channelId);
}

export function cleanupSocket(ws: AuthenticatedWebSocket) {
    connections.delete(ws);
    for (const channelId of [...channelSubscriptions.keys()]) {
        unsubscribe(channelId, ws);
    }
}

/** Sends one frame to every socket on this process that joined the channel. */
export function deliverToChannel(channelId: string, frame: unknown) {
    const subscribers = channelSubscriptions.get(channelId);
    if (!subscribers) return;

    const data = JSON.stringify(frame);
    for (const ws of subscribers) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        } else {
            unsubscribe(channelId, ws);
        }
    }
}

/** Closes every socket that authenticated with this token. Used on logout. */
export function closeSocketsForToken(tokenHash: string) {
    for (const ws of connections) {
        if (ws.tokenHash === tokenHash) {
            ws.close(CLOSE_SESSION_ENDED, "signed out");
        }
    }
}

/** Drops one user from one channel and tells their sockets. */
export function evictFromChannel(userId: string, channelId: string) {
    const subscribers = channelSubscriptions.get(channelId);
    if (!subscribers) return;

    for (const ws of [...subscribers]) {
        if (ws.userId !== userId) continue;
        unsubscribe(channelId, ws);
        sendFrame(ws, { type: "removed_from_channel", channelId });
    }
}

/** Distinct (user, channel) pairs currently subscribed on this process. */
export function subscribedPairs(): { userId: string; channelId: string }[] {
    const pairs = new Map<string, { userId: string; channelId: string }>();
    for (const [channelId, subscribers] of channelSubscriptions) {
        for (const ws of subscribers) {
            pairs.set(`${ws.userId}:${channelId}`, { userId: ws.userId, channelId });
        }
    }
    return [...pairs.values()];
}
