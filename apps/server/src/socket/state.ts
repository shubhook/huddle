import type { AuthenticatedWebSocket } from "./types";

export const channelSubscriptions = new Map<string, Set<AuthenticatedWebSocket>>();

export function cleanupSocket(ws: AuthenticatedWebSocket) {
    for (const [channelId, subscribers] of channelSubscriptions) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
            channelSubscriptions.delete(channelId);
        }
    }
}