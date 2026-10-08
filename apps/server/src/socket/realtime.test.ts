import { afterAll, beforeAll, expect, test } from "bun:test";
import { config } from "dotenv";
import express from "express";
import type { Server } from "http";
import { fileURLToPath } from "node:url";
import {
    CLOSE_SESSION_ENDED,
    serverFrameSchema,
    type ClientFrame,
    type ServerFrame,
} from "@huddle/protocol";

// Load the server env before any module that reads it. An empty REDIS_URL
// keeps this file on the in-process bus, which is the path a single API uses.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
process.env.JWT_SECRET ??= "test-jwt-secret-at-least-32-characters-long";
process.env.DATABASE_URL ??= "postgresql://huddle:huddle@127.0.0.1:5432/huddle";
process.env.REDIS_URL = "";
process.env.WS_HEARTBEAT_MS = "600000";
process.env.WS_MEMBERSHIP_RECHECK_MS = "600000";

const { prisma } = await import("../db");
const { setupWebSocket } = await import("./index");
const { startSession } = await import("../services/session.service");
const { revalidateSessions, revalidateSubscriptions } = await import("./maintenance");

type FrameOf<T extends ServerFrame["type"]> = Extract<ServerFrame, { type: T }>;

class SocketClient {
    readonly ws: WebSocket;
    readonly frames: ServerFrame[] = [];
    private closed: { code: number } | null = null;
    private readonly opened: Promise<void>;

    constructor(url: string, token: string) {
        this.ws = new WebSocket(url, {
            headers: {
                Cookie: `jwt_token=${token}`,
                Origin: "http://localhost:3008",
            },
        });

        this.opened = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`socket open timed out (close ${this.closed?.code ?? "none"})`));
            }, 4000);
            this.ws.addEventListener("open", () => {
                clearTimeout(timer);
                resolve();
            });
        });

        this.ws.addEventListener("message", (event) => {
            const result = serverFrameSchema.safeParse(JSON.parse(String(event.data)));
            if (result.success) this.frames.push(result.data);
        });

        this.ws.addEventListener("close", (event) => {
            this.closed = { code: event.code };
        });
    }

    async ready(): Promise<void> {
        await this.opened;
    }

    send(frame: ClientFrame) {
        this.ws.send(JSON.stringify(frame));
    }

    async waitFor<T extends ServerFrame["type"]>(type: T, timeoutMs = 4000): Promise<FrameOf<T>> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const found = this.frames.find((frame) => frame.type === type);
            if (found) return found as FrameOf<T>;
            await Bun.sleep(15);
        }
        throw new Error(`timed out waiting for ${type}; saw ${this.frames.map((frame) => frame.type).join(", ") || "nothing"}`);
    }

    async waitForClose(timeoutMs = 4000): Promise<{ code: number }> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (this.closed) return this.closed;
            await Bun.sleep(15);
        }
        throw new Error("timed out waiting for the socket to close");
    }

    close() {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
        }
    }
}

let server: Server | undefined;
let url = "";
let workspaceId = "";
let channelId = "";
const userIds: string[] = [];
const clients: SocketClient[] = [];

async function connect(token: string): Promise<SocketClient> {
    const client = new SocketClient(url, token);
    clients.push(client);
    await client.ready();
    return client;
}

async function makeMember() {
    const stamp = crypto.randomUUID().slice(0, 8);
    const user = await prisma.user.create({
        data: { username: `u_${stamp}`, email: `${stamp}@huddle.test` },
    });
    userIds.push(user.id);
    await prisma.workspaceMember.create({
        data: { userId: user.id, workspaceId, role: "member" },
    });
    await prisma.channelMember.create({
        data: { userId: user.id, channelId },
    });
    const token = await startSession(user.id);
    const session = await prisma.session.findFirstOrThrow({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
    });
    return { user, token, sessionId: session.id };
}

beforeAll(async () => {
    const app = express();
    server = setupWebSocket(app);
    await new Promise<void>((resolve, reject) => {
        const onError = (err: Error) => reject(err);
        server!.once("error", onError);
        server!.listen(0, "127.0.0.1", () => {
            server!.off("error", onError);
            resolve();
        });
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server has no port");
    url = `ws://127.0.0.1:${address.port}`;

    const workspace = await prisma.workspace.create({ data: { name: `ws-${crypto.randomUUID().slice(0, 8)}` } });
    workspaceId = workspace.id;
    const channel = await prisma.channel.create({
        data: { name: "general", workspaceId },
    });
    channelId = channel.id;
}, 20_000);

afterAll(async () => {
    for (const client of clients) client.close();
    if (server) {
        await new Promise<void>((resolve, reject) => {
            server!.close((err) => (err ? reject(err) : resolve()));
        });
    }

    if (channelId) {
        await prisma.message.deleteMany({ where: { channelId } });
        await prisma.channelMember.deleteMany({ where: { channelId } });
        await prisma.channel.deleteMany({ where: { id: channelId } });
    }
    if (workspaceId) {
        await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
        await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    if (userIds.length > 0) {
        await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
});

test("two clients in a channel both see a message", async () => {
    const alice = await makeMember();
    const bob = await makeMember();
    const a = await connect(alice.token);
    const b = await connect(bob.token);

    const join: ClientFrame = { type: "join_channel", payload: { channelId, workspaceId } };
    a.send(join);
    b.send(join);
    await a.waitFor("join_channel_ack");
    await b.waitFor("join_channel_ack");

    a.send({
        type: "send_message",
        payload: {
            channelId,
            workspaceId,
            content: "hello from alice",
            clientMessageId: "alice-1",
        },
    });

    const ack = await a.waitFor("send_message_ack");
    expect(ack.clientMessageId).toBe("alice-1");
    expect(ack.channelId).toBe(channelId);

    const onBob = await b.waitFor("new_message");
    expect(onBob.payload.content).toBe("hello from alice");
    expect(onBob.payload.senderId).toBe(alice.user.id);
    expect(onBob.payload.senderUsername).toBe(alice.user.username);

    const onAlice = a.frames.find((frame) => frame.type === "new_message");
    expect(onAlice?.type).toBe("new_message");
}, 15_000);

test("a leave queued behind a join cannot overtake it", async () => {
    const alice = await makeMember();
    const bob = await makeMember();
    const a = await connect(alice.token);
    const b = await connect(bob.token);

    b.send({ type: "join_channel", payload: { channelId, workspaceId } });
    await b.waitFor("join_channel_ack");

    // Both frames are handed to the socket before either ack. Join waits on
    // the database. Leave does not. Without the per-socket queue, leave
    // finishes first and the later join leaves the socket subscribed.
    a.send({ type: "join_channel", payload: { channelId, workspaceId } });
    a.send({ type: "leave_channel", payload: { channelId } });

    await a.waitFor("leave_channel_ack");
    const types = a.frames.map((frame) => frame.type);
    expect(types.indexOf("join_channel_ack")).toBeGreaterThanOrEqual(0);
    expect(types.indexOf("join_channel_ack")).toBeLessThan(types.indexOf("leave_channel_ack"));

    b.send({
        type: "send_message",
        payload: { channelId, workspaceId, content: `after leave ${crypto.randomUUID()}` },
    });
    await b.waitFor("new_message");
    await Bun.sleep(250);
    expect(a.frames.some((frame) => frame.type === "new_message")).toBe(false);
}, 15_000);

test("membership recheck drops a user who lost access", async () => {
    const alice = await makeMember();
    const bob = await makeMember();
    const a = await connect(alice.token);
    const b = await connect(bob.token);

    const join: ClientFrame = { type: "join_channel", payload: { channelId, workspaceId } };
    a.send(join);
    b.send(join);
    await a.waitFor("join_channel_ack");
    await b.waitFor("join_channel_ack");

    await prisma.channelMember.delete({
        where: { userId_channelId: { userId: bob.user.id, channelId } },
    });
    await revalidateSubscriptions();

    const removed = await b.waitFor("removed_from_channel");
    expect(removed.channelId).toBe(channelId);

    a.send({
        type: "send_message",
        payload: { channelId, workspaceId, content: `after eviction ${crypto.randomUUID()}` },
    });
    await a.waitFor("new_message");
    await Bun.sleep(250);
    expect(b.frames.some((frame) => frame.type === "new_message")).toBe(false);
}, 15_000);

test("session recheck closes a revoked session", async () => {
    const alice = await makeMember();
    const a = await connect(alice.token);

    await prisma.session.update({
        where: { id: alice.sessionId },
        data: { revokedAt: new Date() },
    });
    await revalidateSessions();

    const closed = await a.waitForClose();
    expect(closed.code).toBe(CLOSE_SESSION_ENDED);
}, 15_000);
