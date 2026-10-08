import type { Request, Response } from "express";
import { z } from "zod";
import { mark_read_schema, message_schema, new_channel_schema } from "../types/request.schema";
import { prisma } from "../db";
import type { Prisma } from "../generated/prisma/client";
import { ChannelAccessError } from "../services/channel-access";
import { MessageRateLimitError, sendChannelMessage } from "../services/message.service";
import { publishEvent } from "../socket/bus";
import { sendTooMany } from "../utils/rate-limit";

export async function createChannel(req: Request, res: Response) {
    const parsedBody = new_channel_schema.safeParse(req.body);
    if(!parsedBody.success) {
        res.status(400).json({
            error: parsedBody.error,
            message: parsedBody.error.issues[0]?.message ?? "Invalid channel name"
        });
        return;
    }

    const workspaceId = req.params.id as string;
    if(!workspaceId) {
        res.status(400).json({ error: "Workspace ID is required" });
        return;
    }

    try {
        const channel = await prisma.$transaction( async (tx) => {
            const createdChannel = await tx.channel.create({
                data: {
                    name: parsedBody.data.name,
                    workspaceId: workspaceId,
                }
            });

            const members = await tx.workspaceMember.findMany({
                where: {
                    workspaceId: workspaceId,
                }
            })

            await tx.channelMember.createMany({
                data: members.map((member) => ({
                    channelId: createdChannel.id,
                    userId: member.userId,
                }))
            })

            return { createdChannel, memberIds: members.map((member) => member.userId) };
        });

        // Members' open sockets subscribe to the new channel, wherever they are connected.
        await publishEvent({ kind: "channels_joined", userIds: channel.memberIds, channelIds: [channel.createdChannel.id] });

        res.status(201).json({ 
            message: "Channel created successfully",
            data: channel.createdChannel
        });
        return;
        
    }
    catch(e) {
        if ((e as { code?: string }).code === "P2002") {
            res.status(409).json({ message: "A channel with that name already exists." });
            return;
        }

        console.error(e)
        res.status(500).json({ 
            message: "Failed to create channel. Please try again.",
        });
        return;
    }
}

export async function getAllChannels(req: Request, res: Response) {
    const workspaceId = req.params.id as string;

    if(!workspaceId) {
            res.status(400).json({ error: "Workspace ID is required" });
            return;
    }

    try {
        const channels = await prisma.channel.findMany({
            where: {
                workspaceId,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        res.status(200).json({
            data: channels,
        });
        return;
    } catch (e) {
        console.error(e);
        res.status(500).json({
            message: "Failed to fetch channels. Please try again.",
        });
        return;
    }
}

/** Name, creation date and members, for the channel details panel. Runs after channelAuth. */
export async function getChannelDetails(req: Request, res: Response) {
    const channelId = req.params.id as string;

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: {
            id: true,
            name: true,
            workspaceId: true,
            createdAt: true,
            members: {
                select: { user: { select: { id: true, username: true, avatarId: true } } },
                orderBy: { user: { username: "asc" } },
            },
        },
    });

    if (!channel) {
        res.status(404).json({ message: "Channel not found" });
        return;
    }

    // The role lives on the workspace membership, so look it up for everyone listed.
    const roles = await prisma.workspaceMember.findMany({
        where: {
            workspaceId: channel.workspaceId,
            userId: { in: channel.members.map((member) => member.user.id) },
        },
        select: { userId: true, role: true },
    });
    const roleByUser = new Map(roles.map((row) => [row.userId, row.role]));

    res.status(200).json({
        data: {
            id: channel.id,
            name: channel.name,
            workspaceId: channel.workspaceId,
            createdAt: channel.createdAt,
            members: channel.members.map(({ user }) => ({
                id: user.id,
                username: user.username,
                avatarId: user.avatarId,
                role: roleByUser.get(user.id) ?? "member",
            })),
        },
    });
}

/**
 * Removes the channel with its messages and memberships. Runs after channelAuth and
 * requireWorkspaceRole, so only an owner or admin of the channel's workspace gets here.
 */
export async function deleteChannel(req: Request, res: Response) {
    const channelId = req.params.id as string;

    try {
        const memberIds = await prisma.$transaction(async (tx) => {
            const members = await tx.channelMember.findMany({
                where: { channelId },
                select: { userId: true },
            });

            // Messages and memberships point at the channel without a cascade, so they go first.
            await tx.message.deleteMany({ where: { channelId } });
            await tx.channelMember.deleteMany({ where: { channelId } });
            await tx.channel.delete({ where: { id: channelId } });

            return members.map((member) => member.userId);
        });

        // Members viewing another channel are not subscribed to this one, so tell them by user.
        await publishEvent({ kind: "channel_deleted", channelId, userIds: memberIds });

        res.status(200).json({ message: "Channel deleted" });
    }
    catch (e) {
        // Two deletes racing: the second finds nothing left to delete.
        if ((e as { code?: string }).code === "P2025") {
            res.status(404).json({ message: "Channel not found" });
            return;
        }

        console.error(e);
        res.status(500).json({ message: "Failed to delete channel. Please try again." });
    }
}

const PAGE_SIZE = 50;
const messageCursor = z.string().min(1).max(64);

const withSender = { sender: { select: { username: true, avatarId: true } } } as const;

/**
 * One page of a channel's history, walked by (createdAt, id) so equal timestamps still
 * have a fixed order.
 *
 * - no cursor: the newest PAGE_SIZE, newest first
 * - `before=<id>`: the page older than that message, newest first. `cursor` is the old name
 * - `after=<id>`: the page newer than that message, oldest first. A client that rejoins asks
 *   for everything after the last id it saw and repeats while `hasMore` is true
 *
 * `nextCursor` is the last message in the page. Pass it back in the same direction.
 */
export async function getMessages(req: Request, res: Response) {
    const channelId = req.params.id as string | undefined;

    if(!channelId) { 
        res.status(400).json({ error: "Channel ID is required" });
        return;
    }

    const before = req.query.before ?? req.query.cursor;
    const after = req.query.after;

    if (before !== undefined && after !== undefined) {
        res.status(400).json({ message: "Pass before or after, not both" });
        return;
    }

    const direction = after !== undefined ? "after" : "before";
    const parsedCursor = messageCursor.optional().safeParse(after ?? before);
    if (!parsedCursor.success) {
        res.status(400).json({ message: "Invalid cursor" });
        return;
    }
    const cursorId = parsedCursor.data;

    try {
        let range: Prisma.MessageWhereInput = {};
        if (cursorId) {
            const cursor = await prisma.message.findFirst({
                where: { id: cursorId, channelId },
                select: { id: true, createdAt: true },
            });
            if (!cursor) {
                res.status(400).json({ message: "Cursor is not a message in this channel" });
                return;
            }
            const op = direction === "after" ? "gt" : "lt";
            range = {
                OR: [
                    { createdAt: { [op]: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { [op]: cursor.id } },
                ],
            };
        }

        const order = direction === "after" ? "asc" : "desc";
        const rows = await prisma.message.findMany({
            where: { channelId, ...range },
            // One extra row says whether another page exists.
            take: PAGE_SIZE + 1,
            orderBy: [{ createdAt: order }, { id: order }],
            include: withSender,
        });

        const hasMore = rows.length > PAGE_SIZE;
        const batchMessage = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

        res.status(200).json({
            batchMessage,
            nextCursor: batchMessage.at(-1)?.id ?? null,
            hasMore,
        });
        return;
    }
    catch(e) {
        console.error(e);
        res.status(500).json({
            message: "Failed to fetch messages. Please try again.",
        });
        return;
    }
}

export async function sendMessages(req: Request, res: Response) {
    const channelId = req.params.id as string;
    const body = message_schema.safeParse(req.body);

    if(!body.success) {
        res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid message content" });
        return;
    }

    try {
        // Same path the websocket uses, so the message also reaches live subscribers.
        const response = await sendChannelMessage({
            userId: req.userId,
            channelId,
            content: body.data.content,
            clientMessageId: body.data.clientMessageId,
        });

        res.status(201).json({
            message: "Message sent successfully",
            data: response
        });
        return;
    }
    catch(e) {
        if (e instanceof ChannelAccessError) {
            res.status(e.status).json({ message: e.message });
            return;
        }

        if (e instanceof MessageRateLimitError) {
            sendTooMany(res, e.retryAfterSeconds, "messages");
            return;
        }

        console.error(e);
        res.status(500).json({
            message: "Failed to send message. Please try again.",
        });
        return;
    }
}

/**
 * Moves the caller's read marker forward to this message. Runs after channelAuth.
 * Never moves it back, so a slow request from one tab cannot undo a newer one from another.
 */
export async function markChannelRead(req: Request, res: Response) {
    const channelId = req.params.id as string;
    const body = mark_read_schema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid message id" });
        return;
    }

    const messageId = body.data.messageId;

    try {
        const message = await prisma.message.findFirst({
            where: { id: messageId, channelId },
            select: { id: true },
        });
        if (!message) {
            res.status(404).json({ message: "Message not found in this channel" });
            return;
        }

        await prisma.$executeRaw`
            UPDATE "ChannelMember" AS cm
            SET "lastReadMessageId" = m."id"
            FROM "Message" AS m
            WHERE cm."userId" = ${req.userId}
              AND cm."channelId" = ${channelId}
              AND m."id" = ${messageId}
              AND NOT EXISTS (
                  SELECT 1 FROM "Message" AS r
                  WHERE r."id" = cm."lastReadMessageId"
                    AND (r."createdAt", r."id") >= (m."createdAt", m."id")
              )`;

        res.status(204).end();
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to mark channel read. Please try again." });
    }
}
