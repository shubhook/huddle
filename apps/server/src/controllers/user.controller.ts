import express, { type NextFunction, type Request, type Response } from "express";
import {
    AVATAR_UPLOAD_LIMIT_BYTES,
    findAvatar,
    InvalidAvatarError,
    normalizeAvatar,
    removeAvatar,
    setAvatar,
} from "../services/avatar.service";

const readImageBody = express.raw({ type: "image/*", limit: AVATAR_UPLOAD_LIMIT_BYTES });

/** express.raw, but a body that is too large gets a JSON answer instead of an HTML page. */
export function avatarBody(req: Request, res: Response, next: NextFunction) {
    readImageBody(req, res, (err?: unknown) => {
        if (!err) return next();
        const status = (err as { status?: number }).status;
        if (status === 413) {
            res.status(413).json({ message: "That image is too large. Pick one under 2 MB." });
            return;
        }
        next(err);
    });
}

export async function uploadAvatar(req: Request, res: Response) {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ message: "Send the image as the request body." });
        return;
    }

    let data: Buffer;
    try {
        data = await normalizeAvatar(req.body);
    } catch (err) {
        if (err instanceof InvalidAvatarError) {
            res.status(400).json({ message: err.message });
            return;
        }
        throw err;
    }

    const avatarId = await setAvatar(req.userId!, data);
    res.status(200).json({ avatarId });
}

export async function deleteAvatar(req: Request, res: Response) {
    await removeAvatar(req.userId!);
    res.status(204).end();
}

/**
 * Public, like profile pictures elsewhere: an <img> on another origin cannot be relied on
 * to send the login cookie. The URL carries the avatar id, so a matching request is cached
 * for good and a new upload simply gets a new URL.
 */
export async function getAvatar(req: Request, res: Response) {
    const user = await findAvatar(req.params.id as string);
    if (!user?.avatarId || !user.avatar) {
        res.status(404).json({ message: "No avatar" });
        return;
    }

    const current = req.query.v === user.avatarId;
    res.setHeader(
        "Cache-Control",
        current ? "public, max-age=31536000, immutable" : "public, max-age=60",
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("ETag", `"${user.avatarId}"`);
    if (req.get("if-none-match") === `"${user.avatarId}"`) {
        res.status(304).end();
        return;
    }
    res.type("image/webp").send(Buffer.from(user.avatar.data));
}
