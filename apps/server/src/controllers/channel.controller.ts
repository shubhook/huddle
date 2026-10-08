import type { Request, Response } from "express";
import { message_schema, new_channel_schema } from "../types/request.schema";
import { prisma } from "../db";
import { ChannelAccessError } from "../services/channel-access";
import { sendChannelMessage } from "../services/message.service";
import { publishEvent } from "../socket/bus";

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

            return createdChannel;
        });

        res.status(201).json({ 
            message: "Channel created successfully",
            data: channel
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

export async function getMessages(req: Request, res: Response) {
    const channelId = req.params.id as string | undefined;
    const cursor = req.query.cursor as string  | undefined;

    if(!channelId) { 
        res.status(400).json({ error: "Channel ID is required" });
        return;
    }

    try {
        let channelMessages;
        if(!cursor) {
            channelMessages = await prisma.message.findMany({
                where: { channelId: channelId },
                take: 50,
                orderBy: { createdAt: "desc" },
                include: { sender: { select: { username: true, avatarId: true } } }
            });
        }
        else {
            channelMessages = await prisma.message.findMany({
                where: { channelId: channelId },
                take: 50,
                skip: 1,
                cursor: { id: cursor },
                orderBy: { createdAt: "desc" },
                include: { sender: { select: { username: true, avatarId: true } } }
            });
        }

        res.status(200).json({
            batchMessage: channelMessages,
            nextCursor:  channelMessages[channelMessages.length - 1]?.id
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
    const content = message_schema.safeParse(req.body);

    if(!content.success) {
        res.status(400).json({ message: content.error.issues[0]?.message ?? "Invalid message content" });
        return;
    }

    try {
        // Same path the websocket uses, so the message also reaches live subscribers.
        const response = await sendChannelMessage({
            userId: req.userId,
            channelId,
            content: content.data.content,
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

        console.error(e);
        res.status(500).json({
            message: "Failed to send message. Please try again.",
        });
        return;
    }
}