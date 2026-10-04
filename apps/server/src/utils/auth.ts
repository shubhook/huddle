import type { Request, Response, NextFunction } from "express"
import { AUTH_COOKIE } from "./cookies";
import { isTokenError, verifyToken, type VerifiedToken } from "./token";
import { findActiveSession } from "../services/session.service";

export type { tokenPayload } from "./token";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies[AUTH_COOKIE] as string;

    if(token == undefined || token == "") {
        res.status(401).json({
            message: "<Missing Token>"
        });
        return;
    }

    let decoded: VerifiedToken;
    try {
        decoded = verifyToken(token);
    } catch(err) {
        if (!isTokenError(err)) console.error(err);
        res.status(401).json({
            message: "Unauthorised Endpoint"
        });
        return;
    }

    try {
        // A signed token is not enough. Logout and revocation work by ending the session row.
        const session = await findActiveSession(decoded);

        if (!session) {
            res.status(401).json({
                message: "Session ended, sign in again"
            });
            return;
        }

        req.userId = session.userId;
        req.sessionId = session.id;
        next();
    } catch(err) {
        console.error(err);
        res.status(503).json({
            message: "Could not verify your session. Try again."
        });
    }
}
