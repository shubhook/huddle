import { WebSocket } from "ws";
import { CLOSE_SESSION_ENDED, type ServerFrame } from "@huddle/protocol";
import { type AuthenticatedWebSocket } from "./types";

export const channelSubscriptions = new Map<string, Set<AuthenticatedWebSocket>>();

/** Every open socket, subscribed to something or not. */
const connections = new Set<AuthenticatedWebSocket>();

/** Open sockets per user on this process, for the per-user cap. */
const socketsPerUser = new Map<string, number>();

export function registerSocket(ws: AuthenticatedWebSocket) {
    connections.add(ws);
    socketsPerUser.set(ws.userId, (socketsPerUser.get(ws.userId) ?? 0) + 1);
}

export function socketCountForUser(userId: string): number {
    return socketsPerUser.get(userId) ?? 0;
}

export function sendFrame(ws: WebSocket, frame: ServerFrame) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(frame));
    }
}

export function sendError(
    ws: WebSocket,
    code: string,
    message: string,
    extra: { clientMessageId?: string; retryAfterSeconds?: number } = {},
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
    if (connections.delete(ws)) {
        const left = (socketsPerUser.get(ws.userId) ?? 1) - 1;
        if (left > 0) socketsPerUser.set(ws.userId, left);
        else socketsPerUser.delete(ws.userId);
    }
    for (const channelId of [...channelSubscriptions.keys()]) {
        unsubscribe(channelId, ws);
    }
}

/** Sends one frame to every socket on this process that joined the channel. */
export function deliverToChannel(channelId: string, frame: ServerFrame) {
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

/** The channels each user is subscribed to on this process, for the periodic recheck. */
export function subscriptionsByUser(): Map<string, Set<string>> {
    const byUser = new Map<string, Set<string>>();
    for (const [channelId, subscribers] of channelSubscriptions) {
        for (const ws of subscribers) {
            let channels = byUser.get(ws.userId);
            if (!channels) {
                channels = new Set();
                byUser.set(ws.userId, channels);
            }
            channels.add(channelId);
        }
    }
    return byUser;
}

/**
 * Subscribes a socket to channels and tells it which ones. The client fetches what it
 * missed for those channels only after this frame, so nothing slips between the two.
 */
export function subscribeSocket(ws: AuthenticatedWebSocket, channelIds: string[], type: "subscribed" | "channels_added") {
    if (ws.readyState !== WebSocket.OPEN) return;
    for (const channelId of channelIds) subscribe(channelId, ws);
    sendFrame(ws, { type, channelIds });
}

/** New memberships: subscribe every open socket of those users on this process. */
export function deliverChannelsJoined(userIds: string[], channelIds: string[]) {
    const members = new Set(userIds);
    for (const ws of connections) {
        if (members.has(ws.userId)) subscribeSocket(ws, channelIds, "channels_added");
    }
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
