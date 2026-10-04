import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../utils/auth";
import { byBodyEmail, byIp, HOUR, MINUTE, rateLimit } from "../utils/rate-limit";
import { getCurrentUser, handleGithubCallback, initiateGithubAuth, listSessions, logout, revokeAllUserSessions, revokeOneSession, signin, signup } from "../controllers/auth.controller";

export const authRouter = Router();

// Limits count every attempt, good or bad. bcrypt makes each one expensive for us, which
// is what an attacker is counting on, so the caps are low enough to matter and high enough
// that someone mistyping a password a few times never sees them.
const oauthLimit = rateLimit({ name: "github-ip", windowMs: 15 * MINUTE, max: 30, key: byIp });
const signupLimit = rateLimit({ name: "signup-ip", windowMs: HOUR, max: 10, key: byIp });
const signinLimit = rateLimit(
    { name: "signin-ip", windowMs: 15 * MINUTE, max: 30, key: byIp },
    // Per account as well, so spreading guesses over many IPs still hits a wall.
    { name: "signin-email", windowMs: 15 * MINUTE, max: 10, key: byBodyEmail },
);

authRouter.get('/auth/github', oauthLimit, asyncHandler(initiateGithubAuth));
authRouter.get('/auth/github/callback', oauthLimit, asyncHandler(handleGithubCallback));
authRouter.post('/auth/signup', signupLimit, asyncHandler(signup));
authRouter.post('/auth/signin', signinLimit, asyncHandler(signin));
authRouter.get('/auth/me', requireAuth, asyncHandler(getCurrentUser));
authRouter.post('/auth/logout', asyncHandler(logout));
authRouter.get('/auth/sessions', requireAuth, asyncHandler(listSessions));
authRouter.post('/auth/sessions/revoke-all', requireAuth, asyncHandler(revokeAllUserSessions));
authRouter.delete('/auth/sessions/:id', requireAuth, asyncHandler(revokeOneSession));
