import { request, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { authSchema } from "../types/auth.schema";
import { github } from "../utils/oauth";
import * as arctic from "arctic";
import { prisma } from "../db";
import type { GithubUser } from "../types/oauth.types";
import { generateToken, type tokenPayload } from "../utils/auth";


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