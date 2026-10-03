import type { Request, Response, NextFunction } from "express";
import { assertChannelAccess, ChannelAccessError } from "../services/channel-access";

export async function channelAuth(req: Request, res: Response, next: NextFunction) {
    const channelId = req.params.id as string;

    try {
        const { role } = await assertChannelAccess(req.userId, channelId);

        req.userRole = role;
        next();
    }
    catch(e) {
        if (e instanceof ChannelAccessError) {
            res.status(e.status).json({
                message: e.message
            });
            return;
        }

        console.error(e);
        res.status(500).json({
            message: "Unexpected Error"
        });
    }
}
