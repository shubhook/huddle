import { prisma } from "../db";
import { publishEvent } from "../socket/bus";
import { assertChannelAccess } from "./channel-access";

export interface ChannelMessageEvent {
    id: string;
    channelId: string;
    senderId: string;
    senderUsername: string;
    senderAvatarId: string | null;
    content: string;
    createdAt: Date;
}

/**
 * The only place a channel message is written. REST and the websocket both
 * call it, so a message saved over either path reaches every subscriber.
 */
export async function sendChannelMessage(input: {
    userId: string;
    channelId: string;
    content: string;
    /** Set by the websocket, which is told which workspace the user is viewing. */
    workspaceId?: string;
}): Promise<ChannelMessageEvent> {
    await assertChannelAccess(input.userId, input.channelId, input.workspaceId);

    const saved = await prisma.message.create({
        data: {
            content: input.content,
            senderId: input.userId,
            channelId: input.channelId,
        },
        include: { sender: { select: { username: true, avatarId: true } } },
    });

    const event: ChannelMessageEvent = {
        id: saved.id,
        channelId: saved.channelId,
        senderId: saved.senderId,
        senderUsername: saved.sender.username,
        senderAvatarId: saved.sender.avatarId,
        content: saved.content,
        createdAt: saved.createdAt,
    };

    await publishEvent({
        kind: "channel_frame",
        channelId: event.channelId,
        frame: { type: "new_message", payload: event },
    });

    return event;
}
