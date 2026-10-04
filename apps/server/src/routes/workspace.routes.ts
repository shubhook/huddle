import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../utils/auth";
import { requireWorkspaceRole, workspaceAuth } from "../middleware/workspace.middleware";
import { byIp, byUser, HOUR, rateLimit } from "../utils/rate-limit";
import { createWorkspace, createInvites, joinWorkspace, getWorkspaceDetails, listInvites, listWorkspaces, revokeInvite } from "../controllers/workspace.controller";

export const  workspaceRouter = Router();

workspaceRouter.get('/workspaces', requireAuth, asyncHandler(listWorkspaces));
workspaceRouter.post('/workspaces', requireAuth, asyncHandler(createWorkspace));

// An invite lets someone into the workspace, so only owners hand them out or take them back.
const owners = requireWorkspaceRole("owner");
workspaceRouter.post(
    '/workspaces/:id/invite',
    requireAuth,
    workspaceAuth,
    owners,
    rateLimit({ name: "invite-user", windowMs: HOUR, max: 20, key: byUser }),
    asyncHandler(createInvites),
);
workspaceRouter.get('/workspaces/:id/invites', requireAuth, workspaceAuth, owners, asyncHandler(listInvites));
workspaceRouter.delete('/workspaces/:id/invites/:inviteId', requireAuth, workspaceAuth, owners, asyncHandler(revokeInvite));

// Tokens are UUIDs and not guessable, but nothing should be able to try them at full speed.
workspaceRouter.post(
    '/workspaces/join/:token',
    requireAuth,
    rateLimit(
        { name: "join-user", windowMs: HOUR, max: 20, key: byUser },
        { name: "join-ip", windowMs: HOUR, max: 60, key: byIp },
    ),
    asyncHandler(joinWorkspace),
);
workspaceRouter.get('/workspaces/:id', requireAuth, workspaceAuth, asyncHandler(getWorkspaceDetails));