import type { ServerFrame } from "@huddle/protocol";
import { prisma } from "../db";
import { publishEvent } from "../socket/bus";
import { consumeLimit, type LimitWindow } from "../utils/rate-limit";
import { assertChannelAccess } from "./channel-access";

export interface ChannelMessageEvent {
    id: string;
    channelId: string;
    senderId: string;
    senderUsername: string;
    senderAvatarId: string | null;
    content: string;
    /** The sender's id for this send, so their other tabs can settle a pending copy. */
    clientMessageId: string | null;
    createdAt: Date;
}

/**
 * Per user, across REST and every socket, and across processes when Redis is up.
 * Room for a fast typist and a pasted burst, not for a script.
 */
const MESSAGE_LIMIT: LimitWindow = { name: "message-user", windowMs: 10_000, max: 20 };

export class MessageRateLimitError extends Error {
    constructor(public readonly retryAfterSeconds: number) {
        super(`Sending too fast. Try again in ${retryAfterSeconds} seconds.`);
        this.name = "MessageRateLimitError";
    }
}

const withSender = { sender: { select: { username: true, avatarId: true } } } as const;

type SavedMessage = Awaited<ReturnType<typeof findByClientMessageId>>;

function findByClientMessageId(senderId: string, clientMessageId: string) {
    return prisma.message.findUnique({
        where: { senderId_clientMessageId: { senderId, clientMessageId } },
        include: withSender,
    });
}

function toEvent(saved: NonNullable<SavedMessage>): ChannelMessageEvent {
    return {
        id: saved.id,
        channelId: saved.channelId,
        senderId: saved.senderId,
        senderUsername: saved.sender.username,
        senderAvatarId: saved.sender.avatarId,
        content: saved.content,
        clientMessageId: saved.clientMessageId,
        createdAt: saved.createdAt,
    };
}

/**
 * The only place a channel message is written. REST and the websocket both
 * call it, so a message saved over either path reaches every subscriber.
 *
 * With a clientMessageId the send is idempotent: a resend after a lost ack gets the
 * row that was already saved, and nothing is broadcast a second time.
 */
export async function sendChannelMessage(input: {
    userId: string;
    channelId: string;
    content: string;
    clientMessageId?: string;
    /** Set by the websocket, which is told which workspace the user is viewing. */
    workspaceId?: string;
}): Promise<ChannelMessageEvent> {
    const retryAfter = await consumeLimit(MESSAGE_LIMIT, input.userId);
    if (retryAfter !== null) throw new MessageRateLimitError(retryAfter);

    await assertChannelAccess(input.userId, input.channelId, input.workspaceId);

    if (input.clientMessageId) {
        const existing = await findByClientMessageId(input.userId, input.clientMessageId);
        if (existing) return toEvent(existing);
    }

    let saved: NonNullable<SavedMessage>;
    try {
        saved = await prisma.message.create({
            data: {
                content: input.content,
                senderId: input.userId,
                channelId: input.channelId,
                clientMessageId: input.clientMessageId ?? null,
            },
            include: withSender,
        });
    } catch (e) {
        // The same send arriving twice at once (two tabs, or REST and the socket): one insert
        // wins the unique index, the other returns what it saved.
        if ((e as { code?: string }).code === "P2002" && input.clientMessageId) {
            const existing = await findByClientMessageId(input.userId, input.clientMessageId);
            if (existing) return toEvent(existing);
        }
        throw e;
    }

    const event = toEvent(saved);

    const frame: ServerFrame = {
        type: "new_message",
        payload: {
            id: event.id,
            channelId: event.channelId,
            senderId: event.senderId,
            senderUsername: event.senderUsername,
            senderAvatarId: event.senderAvatarId,
            content: event.content,
            clientMessageId: event.clientMessageId,
            createdAt: event.createdAt.toISOString(),
        },
    };

    await publishEvent({
        kind: "channel_frame",
        channelId: event.channelId,
        frame,
    });

    return event;
}
