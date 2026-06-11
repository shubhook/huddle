import { Router } from "express";
import { authRouter } from "./auth.routes";
import { workspaceRouter } from "./workspace.routes";

export const appRouter = Router();

appRouter.use(authRouter);
appRouter.use(workspaceRouter);