import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { requireWorkspaceRole, workspaceAuth } from "../middleware/workspace.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createChannel, deleteChannel, getAllChannels, getChannelDetails, getMessages, markChannelRead, sendMessages } from "../controllers/channel.controller"
import { channelAuth } from "../middleware/channel.middleware";
import { byUser, MINUTE, rateLimit } from "../utils/rate-limit";

export const channelRouter = Router();

// Only owners and admins shape the workspace's channel list.
channelRouter.post('/workspaces/:id/channels', requireAuth, workspaceAuth, requireWorkspaceRole("owner", "admin"), asyncHandler(createChannel));
channelRouter.get('/workspaces/:id/channels', requireAuth, workspaceAuth, asyncHandler(getAllChannels));
channelRouter.get('/channels/:id', requireAuth, channelAuth, asyncHandler(getChannelDetails));
// channelAuth sets req.userRole from the channel's workspace, which the role check reads.
channelRouter.delete('/channels/:id', requireAuth, channelAuth, requireWorkspaceRole("owner", "admin"), asyncHandler(deleteChannel));
channelRouter.get('/channels/:id/messages', requireAuth, channelAuth, asyncHandler(getMessages));
// No channelAuth or limiter here. The message service runs the same access check and the
// per-user send limit, shared with the websocket so neither path is a way around the other.
channelRouter.post('/channels/:id/messages', requireAuth, asyncHandler(sendMessages));
// The client marks a channel read as messages arrive in it, so this sees steady traffic.
channelRouter.put(
    '/channels/:id/read',
    requireAuth,
    rateLimit({ name: "read-user", windowMs: MINUTE, max: 120, key: byUser }),
    channelAuth,
    asyncHandler(markChannelRead),
);
