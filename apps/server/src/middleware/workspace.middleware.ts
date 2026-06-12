import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db";

export async function workspaceAuth(req: Request, res: Response, next: NextFunction) {
    const workspaceId = req.params.id;

    if (typeof workspaceId !== "string") {
        res.status(400).json({
            message: "Validation Error"
        });
        return;
    }

    try {
        const member = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: workspaceId,
                userId: req.userId,
            }
        });

        if(member == null) {
            res.status(401).json({
                message: "User is not a member of this workspace."
            })
            return;
        }

        req.userRole = member.role;
        next();
    }
    catch(e) {
        console.log(e);
        res.status(500).json({
            message: "Unexpected Error"
        });
    }
}