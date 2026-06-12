import type { Request, Response } from "express";
import { new_channel_schema } from "../types/request.schema";
import { prisma } from "../db";

export async function createChannel(req: Request, res: Response) {
    const parsedBody = new_channel_schema.safeParse(req.body);
    if(!parsedBody.success) {
        res.status(400).json({ error: parsedBody.error });
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

export async function getMessages(req: Request, res: Response) {
    const channelId = req.params.id as string | undefined;
    const cursor = req.params.cursor as string  | undefined;

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
                orderBy: { createdAt: "desc" }
            });
        }
        else {
            channelMessages = await prisma.message.findMany({
                where: { channelId: channelId },
                take: 50,
                skip: 1,
                cursor: { id: cursor },
                orderBy: { createdAt: "desc" }
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