import type { Request, Response } from "express";
import { prisma } from "../db";
import { direct_message_schema } from "../types/request.schema";

/**
 * A direct message belongs to a workspace, so both people must be members of it.
 * Without this, any signed-in user could message anyone, or read a conversation
 * between two users, by naming a workspace they were never in.
 * Returns the error to send, or null when both people belong.
 */
async function checkParticipants(userId: string, otherId: string, workspaceId: string) {
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, userId: { in: [userId, otherId] } },
        select: { userId: true },
    });

    const memberIds = new Set(members.map((member) => member.userId));

    if (!memberIds.has(userId)) {
        return { status: 403, message: "You are not a member of this workspace" };
    }

    if (!memberIds.has(otherId)) {
        return { status: 404, message: "User not found in this workspace" };
    }

    return null;
}

export async function getDirectMessages(req: Request, res: Response) {
    const receiverId = req.params.userId as string;
    const workspaceId = req.query.workspaceId;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    if(!receiverId) {
        res.status(400).json({ error: "Missing receiverId" });
        return;
    }

    if(typeof workspaceId !== "string" || workspaceId === "") {
        res.status(400).json({ error: "Missing workspaceId" });
        return;
    }

    try {
        const denied = await checkParticipants(req.userId, receiverId, workspaceId);
        if (denied) {
            res.status(denied.status).json({ message: denied.message });
            return;
        }

        const whereProps = {
            workspaceId: workspaceId,
            OR: [
                { senderId: req.userId, receiverId: receiverId },
                { senderId: receiverId, receiverId: req.userId }
            ]
        };

        let directMessages;
        if(!cursor) {
            directMessages = await prisma.directMessage.findMany({
                where: whereProps,
                take: 50,
                orderBy: { createdAt: "desc" }
            })
        }
        else {
            directMessages = await prisma.directMessage.findMany({
                where: whereProps,
                take: 50,
                skip: 1,
                cursor: { id: cursor },
                orderBy: { createdAt: "desc" }
            })
        }

        res.status(200).json({
            batchMessage: directMessages,
            nextCursor: directMessages.at(-1)?.id ?? null
        });
        return;
    }
    catch(e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get direct messages." });
        return;
    }
}


export async function sendDirectMessage(req: Request, res: Response) {
    const receiverId = req.params.userId as string;
    const parsedBody = direct_message_schema.safeParse(req.body);

    if(!receiverId) {
        res.status(400).json({ error: "Missing receiverId" });
        return;
    }

    if(!parsedBody.success) {
        res.status(400).json({
            error: "Invalid request body",
            message: parsedBody.error.issues[0]?.message ?? "Invalid request body",
        });
        return;
    }

    try {
        const denied = await checkParticipants(req.userId, receiverId, parsedBody.data.workspaceId);
        if (denied) {
            res.status(denied.status).json({ message: denied.message });
            return;
        }

        const response = await prisma.directMessage.create({
            data: {
                receiverId: receiverId,
                senderId: req.userId,
                content: parsedBody.data.content,
                workspaceId: parsedBody.data.workspaceId
            }
        });

        res.status(201).json({
            message: "Direct message sent successfully",
            data: response
        });
        return;
    }
    catch(e) {
        console.error(e);
        res.status(500).json({ message: "Failed to send direct message. Please try again." });
        return;
    }
}
