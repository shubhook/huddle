import { createHash } from "node:crypto";
import { publishEvent } from "./bus";

export const hashToken = (token: string) =>
    createHash("sha256").update(token).digest("hex");

/**
 * Closes the sockets opened with this token, on every API process.
 * Only a hash goes over the bus, never the token.
 */
export function endSessionSockets(token: string): Promise<void> {
    return publishEvent({ kind: "revoke_token", tokenHash: hashToken(token) });
}
