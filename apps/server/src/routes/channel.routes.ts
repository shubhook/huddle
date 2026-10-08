import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { requireWorkspaceRole, workspaceAuth } from "../middleware/workspace.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createChannel, deleteChannel, getAllChannels, getChannelDetails, getMessages, sendMessages } from "../controllers/channel.controller"
import { channelAuth } from "../middleware/channel.middleware";

export const channelRouter = Router();

// Only owners and admins shape the workspace's channel list.
channelRouter.post('/workspaces/:id/channels', requireAuth, workspaceAuth, requireWorkspaceRole("owner", "admin"), asyncHandler(createChannel));
channelRouter.get('/workspaces/:id/channels', requireAuth, workspaceAuth, asyncHandler(getAllChannels));
channelRouter.get('/channels/:id', requireAuth, channelAuth, asyncHandler(getChannelDetails));
// channelAuth sets req.userRole from the channel's workspace, which the role check reads.
channelRouter.delete('/channels/:id', requireAuth, channelAuth, requireWorkspaceRole("owner", "admin"), asyncHandler(deleteChannel));
channelRouter.get('/channels/:id/messages', requireAuth, channelAuth, asyncHandler(getMessages));
// No channelAuth here. sendMessages goes through the message service, which runs the same check.
channelRouter.post('/channel/:id/messages', requireAuth, asyncHandler(sendMessages));
