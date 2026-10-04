import { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { signinSchema, signupSchema } from "../types/auth.schema";
import { github } from "../utils/oauth";
import * as arctic from "arctic";
import { prisma } from "../db";
import type { GithubUser, GitHubEmail } from "../types/oauth.types";
import { AUTH_COOKIE, clearAuthCookie, crossSiteSameSite, setAuthCookie } from "../utils/cookies";
import { env } from "../utils/env";
import { isTokenError, verifyToken } from "../utils/token";
import {
    listActiveSessions,
    revokeAllSessions,
    revokeSession,
    startSession,
} from "../services/session.service";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { resolveGithubUser } from "../services/github-identity";

/**
 * One message for a taken email and a taken username, so the response does not say which
 * of them exists. Without email verification the signup response still tells an attacker
 * that the pair is taken, which is why signup is also rate limited.
 */
const TAKEN_MESSAGE = "That email or username is already taken.";

/** Same text for an unknown email, a wrong password, and a GitHub-only account. */
const INVALID_LOGIN_MESSAGE = "Invalid email or password";

/**
 * bcrypt takes about the same time on any hash. Comparing against this one when the
 * account is missing keeps "no such email" from answering faster than "wrong password".
 */
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const GITHUB_STATE_COOKIE = "github_oauth_state";
const GITHUB_STATE_TTL_MS = 10 * 60 * 1000;

// Shared by setting and clearing, so the clear matches the SameSite the cookie was set with.
// The OAuth callback is a cross-site redirect from GitHub, hence the cross-site policy.
const githubStateCookieOptions = {
    httpOnly: true,
    sameSite: crossSiteSameSite,
    path: "/",
    secure: env.cookieSecure,
};

const safeEqual = (a: string, b: string) => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
};

/** Map Prisma / DB failures to HTTP status + client-safe message. */
function mapPrismaAuthError(e: unknown): { status: number; message: string } {
    const err = e as { code?: string; errorCode?: string; message?: string };
    const code = err.code ?? err.errorCode;

    if (
        code === "P1000" ||
        code === "P1001" ||
        code === "P1017" ||
        /Can't reach database|Authentication failed against database server|ECONNREFUSED/i.test(
            err.message ?? "",
        )
    ) {
        return {
            status: 503,
            message:
                "Database unavailable (check DATABASE_URL / Postgres credentials).",
        };
    }

    if (code === "P2002") {
        return { status: 409, message: TAKEN_MESSAGE };
    }

    return { status: 500, message: "Internal server error" };
}

export async function initiateGithubAuth(req: Request, res: Response) {
    if (!github) {
        res.status(503).json({ message: "GitHub OAuth is not configured" });
        return;
    }

    const state = arctic.generateState();

    // read:user is read-only. The old "user" scope also let this app edit the GitHub profile.
    const scope = ["read:user", "user:email"];
    const url = github.createAuthorizationURL(state, scope);

    res.cookie(GITHUB_STATE_COOKIE, state, {
        ...githubStateCookieOptions,
        maxAge: GITHUB_STATE_TTL_MS,
    });
    res.redirect(url.toString());
}

/** Where the browser lands after GitHub. Errors become a code in the hash, never a stack trace. */
function webUrl(path: string) {
    const webOrigin = env.clientOrigins[0] ?? "http://localhost:3008";
    return `${webOrigin}/#${path}`;
}

export async function handleGithubCallback(req: Request, res: Response) {
    if (!github) {
        res.status(503).json({ message: "GitHub OAuth is not configured" });
        return;
    }

    const failWith = (code: string) => {
        res.redirect(webUrl(`/signin/${code}`));
    };

    const { code, state, error } = req.query;
    const storedState = req.cookies?.[GITHUB_STATE_COOKIE];

    // The state is single use, so it goes whether this attempt works or not.
    res.clearCookie(GITHUB_STATE_COOKIE, githubStateCookieOptions);

    if (typeof error === "string") {
        failWith("github_denied");
        return;
    }

    if (
        typeof code !== "string" ||
        typeof state !== "string" ||
        typeof storedState !== "string" ||
        !safeEqual(state, storedState)
    ) {
        failWith("invalid_state");
        return;
    }

    try {
        const token = await github.validateAuthorizationCode(code);
        const headers = { Authorization: `Bearer ${token.accessToken()}` };

        const userResponse = await fetch("https://api.github.com/user", { headers });
        if (!userResponse.ok) throw new Error(`GitHub /user returned ${userResponse.status}`);
        const githubUser = (await userResponse.json()) as GithubUser;

        // Always read the email list. The profile email can be unverified, this one says which are not.
        const emailResponse = await fetch("https://api.github.com/user/emails", { headers });
        if (!emailResponse.ok) throw new Error(`GitHub /user/emails returned ${emailResponse.status}`);
        const emails = (await emailResponse.json()) as GitHubEmail[];
        const primary = emails.find((entry) => entry.primary && entry.verified);

        if (!primary) {
            failWith("no_verified_email");
            return;
        }

        const resolved = await resolveGithubUser({
            githubId: String(githubUser.id),
            login: githubUser.login,
            email: primary.email,
        });

        if ("conflict" in resolved) {
            failWith("email_in_use");
            return;
        }

        const sessionToken = await startSession(resolved.user.id, req.get("user-agent"));

        setAuthCookie(res, sessionToken);
        res.redirect(webUrl("/app"));
    } catch (e) {
        console.error(e);
        failWith("github_failed");
    }
}

export async function signup(req: Request, res: Response) {
    const parsedBody = signupSchema.safeParse(req.body);

    if (!parsedBody.success) {
        res.status(400).json({
            // The first problem, in words the form can show as it is.
            message: parsedBody.error.issues[0]?.message ?? "validation error",
            issues: parsedBody.error.issues,
        });
        return;
    }

    const { username, email, password } = parsedBody.data;

    // Hash before looking anything up, so a taken email costs the same time as a free one.
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // The unique index is case sensitive. Check case-insensitively so Bob@x.com
        // and bob@x.com cannot both exist.
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: email, mode: "insensitive" } },
                    { username: { equals: username, mode: "insensitive" } },
                ],
            },
            select: { id: true },
        });

        if (existing) {
            res.status(409).json({ message: TAKEN_MESSAGE });
            return;
        }

        const user = await prisma.user.create({
            data: {
                email: email,
                hashedPassword: hashedPassword,
                username: username,
            },
        });

        const BearerToken = await startSession(user.id, req.get("user-agent"));

        setAuthCookie(res, BearerToken);
        res.status(201).json({
            message: "User Created",
            username,
        });
    } catch (e) {
        console.error(e);
        const { status, message } = mapPrismaAuthError(e);
        res.status(status).json({ message });
        return;
    }
}

export async function getCurrentUser(req: Request, res: Response) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, username: true, email: true },
        });

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.status(200).json({ user });
    } catch (e) {
        console.error(e);
        const { status, message } = mapPrismaAuthError(e);
        res.status(status).json({ message });
    }
}

export async function logout(req: Request, res: Response) {
    const token = req.cookies?.[AUTH_COOKIE];

    if (typeof token === "string" && token !== "") {
        try {
            // End the session on the server. Clearing the cookie only removes the
            // browser's copy, so a token that was already copied would keep working.
            // An expired token still names its session, hence ignoreExpiration.
            const payload = verifyToken(token, { ignoreExpiration: true });
            if (payload.sid && payload.userId) {
                await revokeSession(payload.sid, payload.userId);
            }
        } catch (e) {
            // A forged or garbled token has no session to end. Anything else, such as
            // the database being down, means the session is still alive. Say so and
            // keep the cookie, so the user can retry.
            if (!isTokenError(e)) {
                console.error(e);
                res.status(503).json({ message: "Could not end your session. Try again." });
                return;
            }
        }
    }

    clearAuthCookie(res);
    res.status(200).json({ message: "Logged out" });
}

export async function listSessions(req: Request, res: Response) {
    try {
        const sessions = await listActiveSessions(req.userId);

        res.status(200).json({
            sessions: sessions.map((session) => ({
                id: session.id,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
                userAgent: session.userAgent,
                current: session.id === req.sessionId,
            })),
        });
    } catch (e) {
        console.error(e);
        const { status, message } = mapPrismaAuthError(e);
        res.status(status).json({ message });
    }
}

export async function revokeOneSession(req: Request, res: Response) {
    const sessionId = req.params.id as string;

    try {
        // Scoped to the caller's own sessions, so another user's id looks like a miss.
        const revoked = await revokeSession(sessionId, req.userId);

        if (!revoked) {
            res.status(404).json({ message: "Session not found" });
            return;
        }

        if (sessionId === req.sessionId) clearAuthCookie(res);
        res.status(200).json({ message: "Session revoked" });
    } catch (e) {
        console.error(e);
        const { status, message } = mapPrismaAuthError(e);
        res.status(status).json({ message });
    }
}

const revokeAllSchema = z.object({ keepCurrent: z.boolean().optional() });

export async function revokeAllUserSessions(req: Request, res: Response) {
    const parsedBody = revokeAllSchema.safeParse(req.body ?? {});

    if (!parsedBody.success) {
        res.status(400).json({ message: "validation error", issues: parsedBody.error.issues });
        return;
    }

    const keepCurrent = parsedBody.data.keepCurrent === true;

    try {
        const revoked = await revokeAllSessions(req.userId, keepCurrent ? req.sessionId : undefined);

        if (!keepCurrent) clearAuthCookie(res);
        res.status(200).json({ message: "Sessions revoked", revoked });
    } catch (e) {
        console.error(e);
        const { status, message } = mapPrismaAuthError(e);
        res.status(status).json({ message });
    }
}

export async function signin(req: Request, res: Response) {
    const parsedBody = signinSchema.safeParse(req.body);

    if (!parsedBody.success) {
        res.status(400).json({
            message: parsedBody.error.issues[0]?.message ?? "validation error",
            issues: parsedBody.error.issues,
        });
        return;
    }

    const { email, password } = parsedBody.data;

    try {
        // Accounts made before emails were lowercased may be stored with capitals.
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
        });

        // Always run one bcrypt comparison, whether or not the account exists and
        // whether or not it has a password (GitHub-only accounts do not).
        const passwordMatches = await bcrypt.compare(password, user?.hashedPassword ?? DUMMY_HASH);

        if (!user || !user.hashedPassword || !passwordMatches) {
            res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
            return;
        }

        const BearerToken = await startSession(user.id, req.get("user-agent"));

        setAuthCookie(res, BearerToken);
        res.status(200).json({
            username: user.username,
        });
    } catch (e) {
        console.error(e);
        const { status, message } = mapPrismaAuthError(e);
        res.status(status).json({ message });
        return;
    }
}
