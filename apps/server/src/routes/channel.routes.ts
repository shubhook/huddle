import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { workspaceAuth } from "../middleware/workspace.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createChannel, getAllChannels, getMessages } from "../controllers/channel.controller"
import { channelAuth } from "../middleware/channel.middleware";

export const channelRouter = Router();

channelRouter.post('/workspaces/:id/channels', requireAuth, workspaceAuth, asyncHandler(createChannel));
channelRouter.get('/workspaces/:id/channels', requireAuth, workspaceAuth, asyncHandler(getAllChannels));
channelRouter.get('/channels/:id/messages', requireAuth, channelAuth, asyncHandler(getMessages));
