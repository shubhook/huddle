import type { WebSocketServer } from "ws";
import { prisma } from "../db";
import { env } from "../utils/env";
import { evictFromChannel, subscribedPairs } from "./state";
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
 * Membership is checked when a socket joins a channel. This catches users who
 * lose access afterward, so they stop receiving messages. One query covers up
 * to RECHECK_CHUNK subscriptions.
 */
export async function revalidateSubscriptions() {
    const pairs = subscribedPairs();

    for (let i = 0; i < pairs.length; i += RECHECK_CHUNK) {
        const chunk = pairs.slice(i, i + RECHECK_CHUNK);

        const rows = await prisma.channelMember.findMany({
            where: { OR: chunk.map(({ userId, channelId }) => ({ userId, channelId })) },
            select: { userId: true, channelId: true },
        });

        const stillMember = new Set(rows.map((row) => `${row.userId}:${row.channelId}`));

        for (const { userId, channelId } of chunk) {
            if (!stillMember.has(`${userId}:${channelId}`)) {
                evictFromChannel(userId, channelId);
            }
        }
    }
}

export function startMaintenance(wss: WebSocketServer) {
    const heartbeat = setInterval(() => sweepDeadSockets(wss), env.wsHeartbeatMs);

    const recheck = setInterval(() => {
        revalidateSubscriptions().catch((err) => console.error("membership recheck failed", err));
    }, env.wsMembershipRecheckMs);

    // Do not keep the process alive just for these timers.
    heartbeat.unref();
    recheck.unref();

    wss.on("close", () => {
        clearInterval(heartbeat);
        clearInterval(recheck);
    });
}
