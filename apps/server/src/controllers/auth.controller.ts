import { request, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { signinSchema, signupSchema } from "../types/auth.schema";
import { github } from "../utils/oauth";
import * as arctic from "arctic";
import { prisma } from "../db";
import type { GithubUser } from "../types/oauth.types";
import { generateToken, type tokenPayload } from "../utils/auth";
import { is } from "zod/locales";


export async function initiateGithubAuth(req: Request, res: Response) {
    const state = arctic.generateState();

    const scope = ["user:email", "user"];
    const url = github.createAuthorizationURL(state, scope);

    res.cookie("github_oauth_state", state, { httpOnly: true });
    res.redirect(url.toString());
}

export async function handleGithubCallback(req: Request, res: Response) {
    const code = req.query.code;
    const state = req.query.state;

    const storedState = req.cookies["github_oauth_state"] as string;

    if(code == undefined || storedState == undefined || state != storedState) {
        throw new Error(`Invalid Request`);
    };

    try {
        const token = await github.validateAuthorizationCode(code as string);
        const accessToken = token.accessToken();

        const response = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const githubUser = await response.json() as GithubUser;

        if (!githubUser.email) {
            res.status(400).json({ message: "No email found on GitHub account" });
            return;
        }

        let user = await prisma.user.findUnique({
            where: {
                email: githubUser.email,
            }
        });

        // if the user doesn't exist then we have to create a new entry in the database.
        if(!user) {
            user = await prisma.user.create({
                data: {
                    username: githubUser.login,
                    email: githubUser.email,
                }
            });
        }

        const BearerToken: string = generateToken(user!.id as unknown as tokenPayload);

        res.status(200).json({
            message: "ok",
            token: BearerToken,
            username: githubUser.login
        });
    }
    catch(e) {
        console.log(e);
        res.status(400).json({
            message: "validation error",
        });
    };
}

export async function signup(req: Request, res: Response) {
    const parsedBody = signupSchema.safeParse(req.body);

    if(!parsedBody.success) {
        res.status(400).json({
            message: "validation error"
        });
        return;
    }

    const { username, email, password }  = parsedBody.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email: email,
                hashedPassword: hashedPassword,
                username: username,
            }
        });

        res.status(201).json({
            message: "User Created",
            token: generateToken({ userId: user.id }),
            username
        })
    }
    catch(e) {
        console.log(e);
        res.status(409).json( {
            message: "user already exists",
        });
        return;
    }
}

export async function signin(req: Request, res: Response) {
    const parsedBody = signinSchema.safeParse(req.body);

    if(!parsedBody.success) {
        res.status(400).json({
            message: "validation error"
        });
        return;
    }

    const { email, password }  = parsedBody.data;

    try {
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if(!user || !user.hashedPassword) {
            res.status(404).json({ message: "Invalid credentials" })
            return;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);

        if(!isValid) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        res.status(200).json({
            token: generateToken({ userId: user.id }),
            username: user.username
        });
    } catch(e) {
        console.error(e)
        res.status(400).json({ message: "Invalid Username or Password" });
        return;
    }
}