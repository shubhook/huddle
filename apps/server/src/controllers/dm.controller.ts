import type { Request, Response } from "express";
import { prisma } from "../db";
import { direct_message_schema, message_schema } from "../types/request.schema";

export async function getDirectMessages(req: Request, res: Response) {
    const receiverId = req.params.userId as string;
    const workspaceId = req.query.workspaceId as string;
    const cursor = req.query.cursor as string | undefined;

    if(!receiverId) {
        res.status(400).json({ error: "Missing receiverId" });
        return;
    }

    if(!workspaceId) {
        res.status(400).json({ error: "Missing workspaceId" });
        return;
    }

    try {
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
        res.status(400).json({ error: "Invalid request body" });
        return;
    }

    try {
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