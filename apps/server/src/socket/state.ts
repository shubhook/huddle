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

/** Closes every socket on this process that was opened under one of these sessions. */
export function closeSocketsForSessions(sessionIds: string[]) {
    const ids = new Set(sessionIds);
    for (const ws of connections) {
        if (ids.has(ws.sessionId)) {
            ws.close(CLOSE_SESSION_ENDED, "session ended");
        }
    }
}

/** The sessions behind the open sockets on this process, for the periodic recheck. */
export function connectedSessionIds(): string[] {
    return [...new Set([...connections].map((ws) => ws.sessionId))];
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

/**
 * A deleted channel: drop its room and tell every member's sockets, joined to it or not,
 * so their channel lists update.
 */
export function deliverChannelDeleted(channelId: string, userIds: string[]) {
    channelSubscriptions.delete(channelId);

    const members = new Set(userIds);
    for (const ws of connections) {
        if (members.has(ws.userId)) {
            sendFrame(ws, { type: "channel_deleted", channelId });
        }
    }
}
