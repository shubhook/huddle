import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { handleGithubCallback, initiateGithubAuth, signin, signup } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.get('/auth/github', asyncHandler(initiateGithubAuth));
authRouter.get('/auth/github/callback', asyncHandler(handleGithubCallback));
authRouter.post('/auth/signup', asyncHandler(signup))
authRouter.post('/auth/signin', asyncHandler(signin))