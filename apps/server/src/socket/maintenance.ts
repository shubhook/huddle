import type { WebSocketServer } from "ws";
import { prisma } from "../db";
import { env } from "../utils/env";
import { pruneExpiredSessions } from "../services/session.service";
import { accessibleChannelPairs } from "../services/channel-access";
import { closeSocketsForSessions, connectedSessionIds, evictFromChannel, subscriptionsByUser } from "./state";
import type { AuthenticatedWebSocket } from "./types";

/**
 * Terminates sockets whose peer stopped answering. A proxy or a dropped network
 * can leave a connection that looks open, so each tick sends a ping and expects
 * the pong before the next one.
 */
function sweepDeadSockets(wss: WebSocketServer) {
    for (const client of wss.clients) {
        const ws = client as AuthenticatedWebSocket;

        if (!ws.isAlive) {
            ws.terminate();
            continue;
        }

        ws.isAlive = false;
        try {
            ws.ping();
        } catch {
            ws.terminate();
        }
    }
}

const RECHECK_CHUNK = 200;

/**
 * Membership is checked when a socket subscribes. This catches users who lose access
 * afterward, so they stop receiving messages. One query covers up to RECHECK_CHUNK users.
 */
export async function revalidateSubscriptions() {
    const byUser = [...subscriptionsByUser()];

    for (let i = 0; i < byUser.length; i += RECHECK_CHUNK) {
        const chunk = byUser.slice(i, i + RECHECK_CHUNK);
        const allowed = await accessibleChannelPairs(chunk.map(([userId]) => userId));
        const stillMember = new Set(allowed.map((row) => `${row.userId}:${row.channelId}`));

        for (const [userId, channelIds] of chunk) {
            for (const channelId of channelIds) {
                if (!stillMember.has(`${userId}:${channelId}`)) evictFromChannel(userId, channelId);
            }
        }
    }
}

/**
 * Revocation normally reaches sockets through the event bus. This is the backstop
 * for a missed event (Redis down, a process that was restarting), so a revoked
 * or expired session never keeps a socket open for longer than one interval.
 */
export async function revalidateSessions() {
    const ids = connectedSessionIds();

    for (let i = 0; i < ids.length; i += RECHECK_CHUNK) {
        const chunk = ids.slice(i, i + RECHECK_CHUNK);

        const active = await prisma.session.findMany({
            where: { id: { in: chunk }, revokedAt: null, expiresAt: { gt: new Date() } },
            select: { id: true },
        });

        const stillActive = new Set(active.map((session) => session.id));
        closeSocketsForSessions(chunk.filter((id) => !stillActive.has(id)));
    }
}

const PRUNE_EVERY_MS = 60 * 60 * 1000;

export function startMaintenance(wss: WebSocketServer) {
    const heartbeat = setInterval(() => sweepDeadSockets(wss), env.wsHeartbeatMs);

    const recheck = setInterval(() => {
        revalidateSessions().catch((err) => console.error("session recheck failed", err));
        revalidateSubscriptions().catch((err) => console.error("membership recheck failed", err));
    }, env.wsMembershipRecheckMs);

    // Expired sessions are dead weight. Prune at boot, then hourly.
    const prune = () =>
        pruneExpiredSessions()
            .then((count) => count > 0 && console.log(`Pruned ${count} expired sessions`))
            .catch((err) => console.error("session prune failed", err));
    void prune();
    const pruneTimer = setInterval(prune, PRUNE_EVERY_MS);

    // Do not keep the process alive just for these timers.
    heartbeat.unref();
    recheck.unref();
    pruneTimer.unref();

    wss.on("close", () => {
        clearInterval(heartbeat);
        clearInterval(recheck);
        clearInterval(pruneTimer);
    });
}
