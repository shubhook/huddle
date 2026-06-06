import { Router } from "express";
import { authRouter } from "./auth.routes";

export const appRouter = Router();

appRouter.use(authRouter);