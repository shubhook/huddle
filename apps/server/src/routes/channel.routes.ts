import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { workspaceAuth } from "../middleware/workspace.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createChannel, getAllChannels, getMessages, sendMessages } from "../controllers/channel.controller"
import { channelAuth } from "../middleware/channel.middleware";

export const channelRouter = Router();

channelRouter.post('/workspaces/:id/channels', requireAuth, workspaceAuth, asyncHandler(createChannel));
channelRouter.get('/workspaces/:id/channels', requireAuth, workspaceAuth, asyncHandler(getAllChannels));
channelRouter.get('/channels/:id/messages', requireAuth, channelAuth, asyncHandler(getMessages));
// No channelAuth here. sendMessages goes through the message service, which runs the same check.
channelRouter.post('/channel/:id/messages', requireAuth, asyncHandler(sendMessages));
