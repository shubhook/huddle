import { prisma } from "../db";

export type ChannelAccessErrorCode =
    | "channel_not_found"
    | "workspace_mismatch"
    | "not_workspace_member"
    | "not_channel_member";

const MESSAGES: Record<ChannelAccessErrorCode, string> = {
    channel_not_found: "Channel not found",
    workspace_mismatch: "Channel does not belong to this workspace",
    not_workspace_member: "You are not a member of this workspace",
    not_channel_member: "You are not a member of this channel",
};

export class ChannelAccessError extends Error {
    constructor(public readonly code: ChannelAccessErrorCode) {
        super(MESSAGES[code]);
        this.name = "ChannelAccessError";
    }

    get status(): number {
        return this.code === "channel_not_found" ? 404 : 403;
    }
}

/**
 * The single rule for "may this user touch this channel". REST and the
 * websocket both call it, so they cannot drift apart.
 *
 * Pass expectedWorkspaceId when the caller names a workspace and it must match.
 */
export async function assertChannelAccess(
    userId: string,
    channelId: string,
    expectedWorkspaceId?: string,
) {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });

    if (!channel) throw new ChannelAccessError("channel_not_found");

    if (expectedWorkspaceId !== undefined && channel.workspaceId !== expectedWorkspaceId) {
        throw new ChannelAccessError("workspace_mismatch");
    }

    const [workspaceMember, channelMember] = await Promise.all([
        prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: channel.workspaceId } },
        }),
        prisma.channelMember.findUnique({
            where: { userId_channelId: { userId, channelId } },
        }),
    ]);

    if (!workspaceMember) throw new ChannelAccessError("not_workspace_member");
    if (!channelMember) throw new ChannelAccessError("not_channel_member");

    return { channel, role: workspaceMember.role };
}

/**
 * Every (user, channel) pair the same rule allows: a channel member who is also in the
 * channel's workspace. Sockets subscribe to all of these at connect, and the periodic
 * recheck drops anything that falls out of it.
 */
export async function accessibleChannelPairs(userIds: string[]) {
    if (userIds.length === 0) return [];

    const [channelRows, workspaceRows] = await Promise.all([
        prisma.channelMember.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, channelId: true, channel: { select: { workspaceId: true } } },
        }),
        prisma.workspaceMember.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, workspaceId: true },
        }),
    ]);

    const inWorkspace = new Set(workspaceRows.map((row) => `${row.userId}:${row.workspaceId}`));
    return channelRows
        .filter((row) => inWorkspace.has(`${row.userId}:${row.channel.workspaceId}`))
        .map(({ userId, channelId }) => ({ userId, channelId }));
}
