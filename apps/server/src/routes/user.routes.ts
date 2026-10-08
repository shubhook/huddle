import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../utils/auth";
import { byIp, byUser, HOUR, MINUTE, rateLimit } from "../utils/rate-limit";
import { avatarBody, deleteAvatar, getAvatar, uploadAvatar } from "../controllers/user.controller";

export const userRouter = Router();

// Each upload decodes an image, which costs real CPU, so keep the rate modest.
const avatarWrites = rateLimit({ name: "avatar-user", windowMs: HOUR, max: 30, key: byUser });

userRouter.put('/users/me/avatar', requireAuth, avatarWrites, avatarBody, asyncHandler(uploadAvatar));
userRouter.delete('/users/me/avatar', requireAuth, avatarWrites, asyncHandler(deleteAvatar));
userRouter.get(
    '/users/:id/avatar',
    rateLimit({ name: "avatar-read-ip", windowMs: MINUTE, max: 600, key: byIp }),
    asyncHandler(getAvatar),
);
