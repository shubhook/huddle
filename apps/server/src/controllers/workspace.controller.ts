import type { Request, Response } from "express";
import { new_workspace_schema } from "../types/workspace.schema";
import { prisma } from "../db";
import crypto from "crypto";
import { userInfo } from "os";
import { waitForDebugger } from "inspector";

class WorkspaceNotFoundError extends Error {
    constructor(workspaceId: string) {
        super(`Workspace not found: ${workspaceId}`);
        this.name = "WorkspaceNotFoundError";
    }
}

export async function createWorkspace(req: Request, res: Response) {
    const parsedBody = new_workspace_schema.safeParse(req.body);

    if(!parsedBody.success) {
        res.status(400).json({
            message: "validation error"
        });
        return;
    }

    try {

        const workspace = await prisma.$transaction(async (tx) => {
            const createdWorkspace = await tx.workspace.create({
                data: { name: parsedBody.data.name }
            });

            await tx.workspaceMember.create({
                data: {
                    workspaceId: createdWorkspace.id,
                    userId: req.userId,
                    role: "owner"
                }
            });

            return createdWorkspace;
        });

        res.status(201).json({
            message: `Workspace "${parsedBody.data.name}" created successfully`,
            workspaceId: workspace.id
        })
        
    }
    catch(e) {
        console.error(e)
        res.status(500).json({ 
            message: "Failed to create workspace. Please try again.",
        });
        return;
    }
}

export async function createInvites(req: Request, res: Response) {
    const rawWorkspaceId = req.params.id;
    const workspaceId = Array.isArray(rawWorkspaceId) ? rawWorkspaceId[0] : rawWorkspaceId;

    if(workspaceId == undefined) {
        res.status(404).json({
            message: `Missing WorkspaceId`
        })
        return;
    }

    try {
        const hash: string = crypto.randomUUID().toString();
        const response = await prisma.workspaceInvites.create({
            data: {
                workspaceId: workspaceId,
                token: hash,
                createdId: req.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // expires in 7 days
            }
        });

        res.status(201).json({
            message: "Invite created",
            inviteId: response.id,
            token: response.token
        });
    }
    catch(e) {
        console.log(e);
        res.status(500).json({
            message: "Failed to create invites. Please try again.",
        })
    }   
}


export async function joinWorkspace(req: Request, res: Response) {
    const token: string = req.params.token as string;
    const userId: string = req.userId;

    if(token == undefined ){
        res.status(404).json({ message: `Missing token` });
        return;
    }

    try {
        const response = await prisma.workspaceInvites.findUnique({
            where: {
                token: token,
            }
        });

        if(!response) {
            res.status(404).json({ message: `Invite not found` });
            return;
        }

        if(response.expiresAt && response.expiresAt.getTime() < Date.now()) {
            res.status(410).json({ message: `Invite has expired` });
            return;
        }

        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    workspaceId: response.workspaceId,
                    userId: userId
                }
            }
        });

        if(existingMember) {
            res.status(409).json({ message: `User already exists in this workspace` });
            return;
        }

        const workspace = await prisma.workspaceMember.create({
            data: {
                workspaceId: response.workspaceId,
                userId: userId,
                role: "member"
            }
        });

        res.status(201).json({ message: `Joined workspace`, workspaceId: workspace.workspaceId });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: `Failed to join workspace. Please try again.` });
    }
}

export async function getWorkspaceDetails(req: Request, res: Response) {
    const workspaceId = req.params.id as string;

    if(workspaceId == '' || workspaceId == undefined) {
        res.status(404).json({ message: 'Missing workspaceId' });
        return;
    }

    try {
        const workspaceDetails = await prisma.$transaction( async (tx) => {
            const general = await tx.workspace.findUnique({
                where: {
                    id: workspaceId
                }
            });

            if(!general) {
                throw new WorkspaceNotFoundError(workspaceId);
            }

            const channels = await tx.channel.findMany({
                where: {
                    workspaceId: workspaceId,
                }
            });

            const members = await tx.workspaceMember.findMany({
                where: {
                    workspaceId: workspaceId,
                }
            });

            return {
                general,
                channels,
                members,
            };
        })

        res.status(200).json({ workspaceDetails });
        return;
    }
    catch (e) {
        if (e instanceof WorkspaceNotFoundError) {
            res.status(404).json({ message: "Workspace not found" });
            return;
        }
        console.error(e);
        res.status(500).json({ message: "Failed to get workspace details. Please try again." });
    }
}