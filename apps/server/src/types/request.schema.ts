import { z } from "zod";
import { clientMessageId, MAX_MESSAGE_LENGTH, messageContent } from "@huddle/protocol";

export { clientMessageId, MAX_MESSAGE_LENGTH, messageContent };

export const new_workspace_schema = z.object({
    name: z.string().min(1, "name is required")
});

export const new_channel_schema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "name is required")
        .max(80, "name must be at most 80 characters")
        // Control characters can forge extra lines in logs and break layouts.
        .refine((value) => !/\p{Cc}/u.test(value), "name cannot contain control characters")
});

export const message_schema = z.object({
    content: messageContent,
    clientMessageId: clientMessageId.optional()
});

export const mark_read_schema = z.object({
    messageId: z.string().min(1).max(64)
});

export const direct_message_schema = z.object({
    content: messageContent,
    workspaceId: z.string().min(1, "workspace id is required")
});
