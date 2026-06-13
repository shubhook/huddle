import { Router } from "express";
import { requireAuth } from "../utils/auth";
import { asyncHandler } from "../utils/async-handler";
import { getDirectMessages, sendDirectMessage } from "../controllers/dm.controller";

export const dmRouter = Router();

dmRouter.get('/dm/:userId', requireAuth, asyncHandler(getDirectMessages));
dmRouter.post('/dm/:userId', requireAuth, asyncHandler(sendDirectMessage));