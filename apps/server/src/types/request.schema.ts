import { z } from "zod";

export const new_workspace_schema = z.object({
    name: z.string().min(1, "name is required")
});

export const new_channel_schema = z.object({
    name: z.string().min(1, "name is required")
});

export const message_schema = z.object({
    content: z.string().min(1, "content is required")
});