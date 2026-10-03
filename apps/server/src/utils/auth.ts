import jwt from "jsonwebtoken";
import  type { Request, Response, NextFunction } from "express"
import { env } from "./env";
import { AUTH_COOKIE } from "./cookies";

export type tokenPayload = {
    userId: string
}

/** Tokens used to live forever. Open sockets are closed when this runs out. */
export const TOKEN_TTL = "7d";

export function generateToken(payload: tokenPayload): string {
    return jwt.sign(payload, env.JwtSecret, { expiresIn: TOKEN_TTL });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies[AUTH_COOKIE] as string;

    if(token == undefined || token == "") {
        res.status(401).json({
            message: "<Missing Token>"
        });
        return;
    }
    
    try {
        const decoded = jwt.verify(token, env.JwtSecret) as tokenPayload;
        req.userId = decoded.userId;
        next();
        
    } catch(err) {
        console.log(err);
        res.status(401).json({
            message: "Unauthorised Endpoint"
        });
        return;
    }
}
