import { prisma } from "../db";
import { endSessionSockets } from "../socket/session";
import { signToken, TOKEN_TTL_SECONDS, type VerifiedToken } from "../utils/token";

/** Thrown where a caller wants an error instead of a null, such as the websocket upgrade. */
export class SessionInactiveError extends Error {
    constructor(reason: string) {
        super(reason);
        this.name = "SessionInactiveError";
    }
}

/** Creates the session row and returns the JWT that points at it. */
export async function startSession(userId: string, userAgent?: string): Promise<string> {
    const session = await prisma.session.create({
        data: {
            userId,
            expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000),
            userAgent: userAgent?.slice(0, 255),
        },
    });

    return signToken({ userId, sid: session.id });
}

/**
 * The session a token points at, or null when it should no longer work.
 * A valid signature is not enough. The row must exist, belong to the same user,
 * be unrevoked and unexpired. Old tokens without a sid fail here on purpose,
 * since they could never be revoked.
 */
export async function findActiveSession(token: VerifiedToken) {
    if (!token.sid || !token.userId) return null;

    const session = await prisma.session.findUnique({ where: { id: token.sid } });

    if (
        !session ||
        session.userId !== token.userId ||
        session.revokedAt !== null ||
        session.expiresAt <= new Date()
    ) {
        return null;
    }

    return session;
}

/**
 * Revokes one of the user's sessions and closes its open sockets.
 * Returns false when there was nothing active to revoke.
 */
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const { count } = await prisma.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    if (count === 0) return false;

    await endSessionSockets([sessionId]);
    return true;
}

/** Revokes every active session of the user, optionally keeping one. Returns how many it revoked. */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const active = await prisma.session.findMany({
        where: {
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
            ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        },
        select: { id: true },
    });

    if (active.length === 0) return 0;

    const ids = active.map((session) => session.id);

    await prisma.session.updateMany({
        where: { id: { in: ids }, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    await endSessionSockets(ids);
    return ids.length;
}

export function listActiveSessions(userId: string) {
    return prisma.session.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
    });
}

/** An expired session can no longer be used, so its row has no reason to stay. */
export async function pruneExpiredSessions(): Promise<number> {
    const { count } = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
    return count;
}
