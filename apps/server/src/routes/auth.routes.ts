import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../utils/auth";
import { getCurrentUser, handleGithubCallback, initiateGithubAuth, listSessions, logout, revokeAllUserSessions, revokeOneSession, signin, signup } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.get('/auth/github', asyncHandler(initiateGithubAuth));
authRouter.get('/auth/github/callback', asyncHandler(handleGithubCallback));
authRouter.post('/auth/signup', asyncHandler(signup));
authRouter.post('/auth/signin', asyncHandler(signin));
authRouter.get('/auth/me', requireAuth, asyncHandler(getCurrentUser));
authRouter.post('/auth/logout', asyncHandler(logout));
authRouter.get('/auth/sessions', requireAuth, asyncHandler(listSessions));
authRouter.post('/auth/sessions/revoke-all', requireAuth, asyncHandler(revokeAllUserSessions));
authRouter.delete('/auth/sessions/:id', requireAuth, asyncHandler(revokeOneSession));
