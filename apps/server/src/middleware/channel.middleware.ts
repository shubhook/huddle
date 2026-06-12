import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db";

export async function channelAuth(req: Request, res: Response, next: NextFunction) {
    const channelId = req.params.id as string;

    try {
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId,
            }
        });

        if(!channel) {
            res.status(404).json({
                message: "Channel not found."
            });
            return;   
        }

        const workspaceId = channel.workspaceId;
        const workspaceMember = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: req.userId,
                    workspaceId: workspaceId,
                }
            }
        });

        if(!workspaceMember) {
            res.status(401).json({
                message: "User is not a member of the workspace that owns this channel."
            });
            return;
        }

        req.userRole = workspaceMember.role;
        next();
    }
    catch(e) {
        console.error(e);
        res.status(500).json({
            message: "Unexpected Error"
        });
    }
}