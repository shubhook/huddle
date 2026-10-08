import { createServer, IncomingMessage } from "http";
import type { Duplex } from "stream";
import { type Express } from "express";
import { WebSocketServer, type RawData } from "ws";

import { AUTH_COOKIE } from "../utils/cookies";
import { isAllowedOrigin } from "../utils/origin";
import { isTokenError, verifyToken } from "../utils/token";
import { findActiveSession, SessionInactiveError } from "../services/session.service";
import { accessibleChannelPairs } from "../services/channel-access";
import { onBusEvent, startBus } from "./bus";
import { handleJoinChannel, handleLeaveChannel, handleSendMessage, handleSendDirectMessage, handleLeaveDirectMessage } from "./handlers";
import { startMaintenance } from "./maintenance";
import { clientFrameSchema, CLOSE_SESSION_ENDED, MAX_FRAME_BYTES, type ClientFrame } from "@huddle/protocol";
import {
    cleanupSocket,
    closeSocketsForSessions,
    deliverChannelDeleted,
    deliverChannelsJoined,
    deliverToChannel,
    registerSocket,
    sendError,
    socketCountForUser,
    subscribeSocket,
} from "./state";
import { type AuthenticatedWebSocket } from "./types";

const parseCookies = (cookieString: string) =>
    Object.fromEntries(
        cookieString.split("; ").map((cookie) => {
            const [key, ...value] = cookie.split("=");
            return [key, decodeURIComponent(value.join("="))];
        })
    );


/**
 * Browsers always send Origin on a websocket handshake and page scripts cannot
 * change it, which is what stops another site from riding the user's cookie
 * (cross-site websocket hijacking). A missing Origin means a non-browser client,
 * and those still need a valid JWT to get in.
 */
function isOriginAllowed(origin: string | undefined): boolean {
    if (origin === undefined) return true;
    return isAllowedOrigin(origin);
}

/** destroy() right after write() drops unsent bytes, so flush with end() and destroy in its callback. */
function rejectUpgrade(socket: Duplex, status: string) {
    socket.end(
        `HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
        () => socket.destroy(),
    );
}

async function authenticate(req: IncomingMessage) {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
        throw new SessionInactiveError("no cookie header");
    }

    const cookies = parseCookies(cookieHeader);

    const token = cookies[AUTH_COOKIE];

    if (!token) {
        throw new SessionInactiveError("no session cookie");
    }

    // Signature and expiry first, then the database. A revoked session still has a valid signature.
    const session = await findActiveSession(verifyToken(token));

    if (!session) {
        throw new SessionInactiveError("session revoked, expired, or unknown");
    }

    return { userId: session.userId, sessionId: session.id, expiresAt: session.expiresAt };
}

// setTimeout stores its delay in 32 bits. Longer delays fire immediately.
const MAX_TIMER_MS = 2 ** 31 - 1;

/** The most frames one socket may have waiting. A client that sends faster than we work gets errors. */
const MAX_PENDING_FRAMES = 50;

/**
 * Open sockets one user may hold on this process. Each tab holds one. Every socket is
 * subscribed to all of the user's channels, so an unbounded pile multiplies fan-out.
 */
const MAX_SOCKETS_PER_USER = 10;

/**
 * Every socket receives every channel the user belongs to, so unread markers light up
 * for channels that are not open. Runs on the socket's queue, ahead of any frame it sends.
 */
async function subscribeToMemberChannels(ws: AuthenticatedWebSocket) {
    const pairs = await accessibleChannelPairs([ws.userId]);
    subscribeSocket(ws, pairs.map((pair) => pair.channelId), "subscribed");
}

function rawToString(data: RawData): string {
    if (Array.isArray(data)) return Buffer.concat(data).toString();
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString();
    return data.toString();
}

function dispatch(ws: AuthenticatedWebSocket, frame: ClientFrame): Promise<void> {
    switch (frame.type) {
        case "join_channel":
            return handleJoinChannel(ws, frame.payload);
        case "send_message":
            return handleSendMessage(ws, frame.payload);
        case "leave_channel":
            return handleLeaveChannel(ws, frame.payload);
        case "send_direct_message":
            return handleSendDirectMessage(ws);
        case "leave_direct_message":
            return handleLeaveDirectMessage(ws);
    }
}

function rawByteLength(data: RawData): number {
    if (Array.isArray(data)) return data.reduce((sum, chunk) => sum + chunk.length, 0);
    if (data instanceof ArrayBuffer) return data.byteLength;
    return data.length;
}

function handleRawMessage(ws: AuthenticatedWebSocket, data: RawData, isBinary: boolean) {
    // Bun's ws ignores the maxPayload option (a 5000 byte frame passed a 1024 limit
    // in testing), so enforce it here. Node's ws closes the socket itself, same code.
    if (rawByteLength(data) > MAX_FRAME_BYTES) {
        ws.close(1009, "message too big");
        return;
    }

    if (isBinary) {
        sendError(ws, "invalid_message", "Binary frames are not supported");
        return;
    }

    let json: unknown;
    try {
        json = JSON.parse(rawToString(data));
    } catch {
        sendError(ws, "invalid_json", "Message is not valid JSON");
        return;
    }

    const parsed = clientFrameSchema.safeParse(json);

    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const where = issue?.path.join(".") || "message";
        const clientMessageId = (json as { payload?: { clientMessageId?: unknown } } | null)?.payload?.clientMessageId;

        sendError(ws, "invalid_message", `${where}: ${issue?.message ?? "invalid"}`, {
            clientMessageId: typeof clientMessageId === "string" ? clientMessageId : undefined,
        });
        return;
    }

    const frame = parsed.data;

    if (ws.pending >= MAX_PENDING_FRAMES) {
        sendError(ws, "rate_limited", "Too many requests in flight, slow down");
        return;
    }

    // Run one frame at a time per socket. Without this, leave_channel (instant) can
    // overtake an earlier join_channel (three queries) and the socket ends up joined
    // to a channel the user already left.
    ws.pending++;
    ws.queue = ws.queue
        .then(() => dispatch(ws, frame))
        .catch((err) => {
            console.error(`${frame.type} failed`, err);
            sendError(ws, "internal_error", "Something went wrong, try again", {
                clientMessageId: frame.type === "send_message" ? frame.payload.clientMessageId : undefined,
            });
        })
        .finally(() => {
            ws.pending--;
        });
}

export function setupWebSocket(app: Express) {
    const server = createServer(app);

    const wss = new WebSocketServer({
        noServer: true,
        // The ws default is 100 MiB. Larger frames close the connection with code 1009.
        maxPayload: MAX_FRAME_BYTES,
    });

    // Events from this process and, with Redis, from every other one.
    onBusEvent((event) => {
        if (event.kind === "channel_frame") deliverToChannel(event.channelId, event.frame);
        else if (event.kind === "revoke_sessions") closeSocketsForSessions(event.sessionIds);
        else if (event.kind === "channel_deleted") deliverChannelDeleted(event.channelId, event.userIds);
        else if (event.kind === "channels_joined") deliverChannelsJoined(event.userIds, event.channelIds);
    });
    void startBus();
    startMaintenance(wss);

    server.on("upgrade", async (req, socket, head) => {
        // Check the origin first. It is cheaper than verifying a JWT and a bad
        // origin never gets to learn whether its cookie was valid.
        if (!isOriginAllowed(req.headers.origin)) {
            console.warn(
                `Rejected websocket upgrade from origin ${JSON.stringify((req.headers.origin ?? "").slice(0, 200))}`
            );

            rejectUpgrade(socket, "403 Forbidden");
            return;
        }

        try {
            const session = await authenticate(req);

            // The client may have hung up while the session lookup ran.
            if (socket.destroyed) return;

            // Counted and registered without an await in between, so parallel upgrades cannot all slip past.
            if (socketCountForUser(session.userId) >= MAX_SOCKETS_PER_USER) {
                console.warn(`Rejected websocket upgrade: user ${session.userId} has too many open sockets`);
                rejectUpgrade(socket, "429 Too Many Requests");
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                const authed = ws as AuthenticatedWebSocket;
                authed.userId = session.userId;
                authed.sessionId = session.sessionId;
                authed.isAlive = true;
                authed.queue = Promise.resolve();
                authed.pending = 0;

                // The session is checked at connect, then on a timer and on revocation
                // events. Expiry needs no lookup, so end the socket exactly when it hits.
                const msLeft = Math.max(0, session.expiresAt.getTime() - Date.now());
                if (msLeft <= MAX_TIMER_MS) {
                    authed.expiryTimer = setTimeout(
                        () => authed.close(CLOSE_SESSION_ENDED, "session expired"),
                        msLeft,
                    );
                }

                wss.emit("connection", authed, req);
            });
        } catch (err) {
            // Bad signature, revoked session and a database error all end up here.
            // Log the first two quietly, the last one loudly.
            if (isTokenError(err) || err instanceof SessionInactiveError) {
                console.warn(`Rejected websocket upgrade: ${(err as Error).message}`);
            } else {
                console.error(err);
            }

            rejectUpgrade(socket, "401 Unauthorized");
        }
    });

    wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
        console.log(`User ${ws.userId} connected from ${req.socket.remoteAddress}`);

        registerSocket(ws);

        ws.pending++;
        ws.queue = ws.queue
            .then(() => subscribeToMemberChannels(ws))
            .catch((err) => {
                console.error("initial subscribe failed", err);
                sendError(ws, "internal_error", "Could not subscribe to your channels, reconnect to retry");
            })
            .finally(() => {
                ws.pending--;
            });

        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", (data, isBinary) => {
            try {
                handleRawMessage(ws, data, isBinary);
            } catch (err) {
                console.error("message handling failed", err);
                sendError(ws, "internal_error", "Something went wrong, try again");
            }
        });

        ws.on("close", () => {
            clearTimeout(ws.expiryTimer);
            cleanupSocket(ws);
            console.log(`User ${ws.userId} disconnected`);
        });

        ws.on("error", console.error);
    });

    return server;
}
