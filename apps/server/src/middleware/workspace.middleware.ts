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
            // Signed in, but not allowed here. 401 is for "who are you", 403 for "not you".
            res.status(403).json({
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

/**
 * Use after workspaceAuth, which sets req.userRole.
 * Roles are "owner" and "member". Anything that grants access to the workspace itself,
 * such as an invite, should not be open to every member.
 */
export function requireWorkspaceRole(...allowed: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!allowed.includes(req.userRole)) {
            res.status(403).json({
                message: "Only a workspace owner can do that."
            });
            return;
        }
        next();
    };
}
