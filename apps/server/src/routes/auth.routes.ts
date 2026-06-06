import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { handleGithubCallback, initiateGithubAuth } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.get('/auth/github', asyncHandler(initiateGithubAuth));
authRouter.get('/auth/github/callback', asyncHandler(handleGithubCallback));