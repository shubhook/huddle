import type { Request, Response } from "express";
import { new_workspace_schema } from "../types/request.schema";
import { prisma } from "../db";
import crypto from "crypto";
import { publishEvent } from "../socket/bus";

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

            // Every workspace starts with #general so the owner has somewhere to chat.
            const generalChannel = await tx.channel.create({
                data: {
                    name: "general",
                    workspaceId: createdWorkspace.id
                }
            });

            await tx.channelMember.create({
                data: {
                    channelId: generalChannel.id,
                    userId: req.userId
                }
            });

            return { ...createdWorkspace, generalChannelId: generalChannel.id };
        });

        await publishEvent({ kind: "channels_joined", userIds: [req.userId], channelIds: [workspace.generalChannelId] });

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

export async function listWorkspaces(req: Request, res: Response) {
    try {
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: req.userId },
            orderBy: { joinedAt: "asc" },
            include: { workspace: { select: { id: true, name: true } } }
        });

        res.status(200).json({
            workspaces: memberships.map((membership) => ({
                id: membership.workspace.id,
                name: membership.workspace.name,
                role: membership.role
            }))
        });
    }
    catch(e) {
        console.error(e);
        res.status(500).json({
            message: "Failed to list workspaces. Please try again."
        });
    }
}

const MAX_ACTIVE_INVITES = 25;

export async function listInvites(req: Request, res: Response) {
    const workspaceId = req.params.id as string;

    try {
        const invites = await prisma.workspaceInvites.findMany({
            where: { workspaceId, expiresAt: { gt: new Date() } },
            orderBy: { expiresAt: "desc" },
            // The token is a credential. Owners see who made an invite and when it ends, not the secret.
            select: { id: true, createdId: true, expiresAt: true }
        });

        res.status(200).json({ invites });
    }
    catch(e) {
        console.error(e);
        res.status(500).json({ message: "Failed to list invites. Please try again." });
    }
}

export async function revokeInvite(req: Request, res: Response) {
    const workspaceId = req.params.id as string;
    const inviteId = req.params.inviteId as string;

    try {
        // Scoped to the workspace in the URL, so an owner cannot touch another workspace's invites.
        const { count } = await prisma.workspaceInvites.deleteMany({
            where: { id: inviteId, workspaceId }
        });

        if (count === 0) {
            res.status(404).json({ message: "Invite not found" });
            return;
        }

        res.status(200).json({ message: "Invite revoked" });
    }
    catch(e) {
        console.error(e);
        res.status(500).json({ message: "Failed to revoke invite. Please try again." });
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
        // Every invite is a key to the workspace until it expires, so keep the pile small.
        const active = await prisma.workspaceInvites.count({
            where: { workspaceId, expiresAt: { gt: new Date() } }
        });

        if (active >= MAX_ACTIVE_INVITES) {
            res.status(409).json({
                message: `This workspace already has ${MAX_ACTIVE_INVITES} active invites. Revoke one first.`
            });
            return;
        }

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

        const workspace = await prisma.$transaction( async (tx) => {
            const workspaceMember = await tx.workspaceMember.create({
                data: {
                    workspaceId: response.workspaceId,
                    userId: userId,
                    role: "member"
                }
            });

            const channels = await tx.channel.findMany({
                where: {
                    workspaceId: workspaceMember.workspaceId
                }
            });

            await tx.channelMember.createMany({
                data: channels.map((channel) => ({
                    userId: req.userId,
                    channelId: channel.id,
                }))
            })

            return { ...workspaceMember, channelIds: channels.map((channel) => channel.id) };
        })

        await publishEvent({ kind: "channels_joined", userIds: [userId], channelIds: workspace.channelIds });

        res.status(201).json({ message: `Joined workspace`, workspaceId: workspace.workspaceId });
    }
    catch (e) {
        // Two joins racing past the "already a member" check hit the unique index.
        if ((e as { code?: string }).code === "P2002") {
            res.status(409).json({ message: `User already exists in this workspace` });
            return;
        }

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

            // A channel is unread when someone else posted after the caller's read marker.
            // Each EXISTS is one probe of the (channelId, createdAt, id) index. Keep the
            // comparison a single row comparison: an "IS NULL OR" around it stops Postgres
            // using it as an index bound, and every channel then scans its whole history.
            const unread = await tx.$queryRaw<{ channelId: string }[]>`
                SELECT cm."channelId"
                FROM "ChannelMember" AS cm
                JOIN "Channel" AS c ON c."id" = cm."channelId"
                LEFT JOIN "Message" AS r ON r."id" = cm."lastReadMessageId"
                WHERE cm."userId" = ${req.userId}
                  AND c."workspaceId" = ${workspaceId}
                  AND EXISTS (
                      SELECT 1 FROM "Message" AS m
                      WHERE m."channelId" = cm."channelId"
                        AND m."senderId" <> ${req.userId}
                        AND (m."createdAt", m."id") > (COALESCE(r."createdAt", '-infinity'), COALESCE(r."id", ''))
                  )`;

            return {
                general,
                channels,
                members,
                unreadChannelIds: unread.map((row) => row.channelId),
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