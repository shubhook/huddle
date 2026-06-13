import { Router } from "express";
import { authRouter } from "./auth.routes";
import { workspaceRouter } from "./workspace.routes";
import { channelRouter } from "./channel.routes";
import { dmRouter } from "./dm.routes";

export const appRouter = Router();

appRouter.use(authRouter);
appRouter.use(workspaceRouter);
appRouter.use(channelRouter);
appRouter.use(dmRouter);