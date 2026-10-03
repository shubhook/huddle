import { publishEvent } from "./bus";

/**
 * Closes the sockets opened under these sessions, on every API process.
 * Only session ids go over the bus, never a token.
 */
export function endSessionSockets(sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0) return Promise.resolve();
    return publishEvent({ kind: "revoke_sessions", sessionIds });
}
