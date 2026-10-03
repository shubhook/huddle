import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../utils/auth";
import { workspaceAuth } from "../middleware/workspace.middleware";
import { createWorkspace, createInvites, joinWorkspace, getWorkspaceDetails, listWorkspaces } from "../controllers/workspace.controller";

export const  workspaceRouter = Router();

workspaceRouter.get('/workspaces', requireAuth, asyncHandler(listWorkspaces));
workspaceRouter.post('/workspaces', requireAuth, asyncHandler(createWorkspace));
workspaceRouter.post('/workspaces/:id/invite', requireAuth, workspaceAuth, asyncHandler(createInvites));
workspaceRouter.post('/workspaces/join/:token', requireAuth, asyncHandler(joinWorkspace));
workspaceRouter.get('/workspaces/:id', requireAuth, workspaceAuth, asyncHandler(getWorkspaceDetails));