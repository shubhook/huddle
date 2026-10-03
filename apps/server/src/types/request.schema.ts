import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 4000;

/** Shared by REST and the websocket so both enforce the same rules. */
export const messageContent = z
    .string()
    .trim()
    .min(1, "content is required")
    .max(MAX_MESSAGE_LENGTH, `content must be at most ${MAX_MESSAGE_LENGTH} characters`);

export const new_workspace_schema = z.object({
    name: z.string().min(1, "name is required")
});

export const new_channel_schema = z.object({
    name: z.string().min(1, "name is required")
});

export const message_schema = z.object({
    content: messageContent
});

export const direct_message_schema = z.object({
    content: messageContent,
    workspaceId: z.string().min(1, "workspace id is required")
});
