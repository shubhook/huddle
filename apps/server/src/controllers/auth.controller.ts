import { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { signinSchema, signupSchema } from "../types/auth.schema";
import { github } from "../utils/oauth";
import * as arctic from "arctic";
import { prisma } from "../db";
import type { GithubUser, GitHubEmail } from "../types/oauth.types";
import { generateToken } from "../utils/auth";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies";
import { env } from "../utils/env";

export async function initiateGithubAuth(req: Request, res: Response) {
    if (!github) {
        res.status(503).json({ message: "GitHub OAuth is not configured" });
        return;
    }

    const state = arctic.generateState();

    const scope = ["user:email", "user"];
    const url = github.createAuthorizationURL(state, scope);

    res.cookie("github_oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.cookieSecure,
    });
    res.redirect(url.toString());
}

export async function handleGithubCallback(req: Request, res: Response) {
    if (!github) {
        res.status(503).json({ message: "GitHub OAuth is not configured" });
        return;
    }

    const code = req.query.code;
    const state = req.query.state;

    const storedState = req.cookies["github_oauth_state"] as string;

    if (code == undefined || storedState == undefined || state != storedState) {
        throw new Error(`Invalid Request`);
    }

    try {
        const token = await github.validateAuthorizationCode(code as string);
        const accessToken = token.accessToken();

        const response = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const githubUser = (await response.json()) as GithubUser;
        let email: string | null = githubUser.email;

        if (!email) {
            const emailResponse = await fetch(
                "https://api.github.com/user/emails",
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                },
            );
            const emails = (await emailResponse.json()) as GitHubEmail[];
            const primary = emails.find((e: any) => e.primary && e.verified);
            email = primary?.email ?? null;
        }

        if (!email) {
            res.status(400).json({
                message: "No email found on GitHub account",
            });
            return;
        }

        let user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    username: githubUser.login,
                    email: email,
                },
            });
        }

        const BearerToken: string = generateToken({ userId: user.id });

        setAuthCookie(res, BearerToken);
        const webOrigin = env.clientOrigins[0] ?? "http://localhost:3008";
        res.redirect(`${webOrigin}/#/app`);
    } catch (e) {
        console.log(e);
        res.status(400).json({
            message: "validation error",
        });
    }
}

export async function signup(req: Request, res: Response) {
    const parsedBody = signupSchema.safeParse(req.body);

    if (!parsedBody.success) {
        res.status(400).json({
            message: "validation error",
        });
        return;
    }

    const { username, email, password } = parsedBody.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email: email,
                hashedPassword: hashedPassword,
                username: username,
            },
        });

        const BearerToken: string = generateToken({ userId: user.id });

        setAuthCookie(res, BearerToken);
        res.status(201).json({
            message: "User Created",
            username,
        });
    } catch (e) {
        console.log(e);
        res.status(409).json({
            message: "user already exists",
        });
        return;
    }
}

export async function getCurrentUser(req: Request, res: Response) {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, username: true, email: true },
    });

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    res.status(200).json({ user });
}

export async function logout(req: Request, res: Response) {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logged out" });
}

export async function signin(req: Request, res: Response) {
    const parsedBody = signinSchema.safeParse(req.body);

    if (!parsedBody.success) {
        res.status(400).json({
            message: "validation error",
        });
        return;
    }

    const { email, password } = parsedBody.data;

    try {
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user || !user.hashedPassword) {
            res.status(404).json({ message: "Invalid credentials" });
            return;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);

        if (!isValid) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const BearerToken: string = generateToken({ userId: user.id });

        setAuthCookie(res, BearerToken);
        res.status(200).json({
            username: user.username,
        });
    } catch (e) {
        console.error(e);
        res.status(400).json({ message: "Invalid Username or Password" });
        return;
    }
}
