import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { prisma } from "../db";

/** Every stored picture is this many pixels square. Big enough for 2x screens at 64px. */
export const AVATAR_SIZE = 128;
/** Largest upload accepted. The web app shrinks pictures before sending, so this is generous. */
export const AVATAR_UPLOAD_LIMIT_BYTES = 2 * 1024 * 1024;
/** Refuse to decode anything bigger, so a tiny file cannot unpack into gigabytes of pixels. */
const MAX_INPUT_PIXELS = 6000 * 6000;
/** Formats sharp may decode. It also reads SVG, TIFF and others, and none of those are needed. */
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif", "avif"]);

export class InvalidAvatarError extends Error {}

/**
 * Re-encodes whatever was uploaded as a small square WebP. Decoding and encoding again
 * also drops EXIF data such as GPS position, and means only bytes we produced are served.
 */
export async function normalizeAvatar(input: Buffer): Promise<Buffer> {
    try {
        const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false });
        const { format } = await image.metadata();
        if (!format || !ACCEPTED_FORMATS.has(format)) {
            throw new InvalidAvatarError("Use a JPEG, PNG or WebP image.");
        }
        return await image
            .rotate()
            .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
            .webp({ quality: 80, effort: 4 })
            .toBuffer();
    } catch (err) {
        if (err instanceof InvalidAvatarError) throw err;
        throw new InvalidAvatarError("That file could not be read as an image.");
    }
}

/** Saves the picture and returns its new id, which changes the URL so caches pick it up. */
export async function setAvatar(userId: string, data: Buffer): Promise<string> {
    const avatarId = randomBytes(8).toString("base64url");
    const bytes = new Uint8Array(data);
    await prisma.$transaction([
        prisma.userAvatar.upsert({
            where: { userId },
            create: { userId, data: bytes },
            update: { data: bytes },
        }),
        prisma.user.update({ where: { id: userId }, data: { avatarId } }),
    ]);
    return avatarId;
}

export async function removeAvatar(userId: string): Promise<void> {
    await prisma.$transaction([
        prisma.userAvatar.deleteMany({ where: { userId } }),
        prisma.user.update({ where: { id: userId }, data: { avatarId: null } }),
    ]);
}

export async function findAvatar(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: { avatarId: true, avatar: { select: { data: true } } },
    });
}
