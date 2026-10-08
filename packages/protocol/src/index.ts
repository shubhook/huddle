import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 4000;

/** Shared by REST and the websocket so both enforce the same rules. */
export const messageContent = z
    .string()
    .trim()
    .min(1, "content is required")
    .max(MAX_MESSAGE_LENGTH, `content must be at most ${MAX_MESSAGE_LENGTH} characters`);

const id = z.string().min(1).max(64);

/** Picked by the client per send. Repeating one returns the saved message instead of a duplicate. */
export const clientMessageId = z.string().min(1).max(64);

/** Every frame a client may send. Anything else gets an error frame back. */
export const clientFrameSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("join_channel"),
        payload: z.object({ channelId: id, workspaceId: id }),
    }),
    z.object({
        type: z.literal("leave_channel"),
        payload: z.object({ channelId: id }),
    }),
    z.object({
        type: z.literal("send_message"),
        payload: z.object({
            channelId: id,
            workspaceId: id,
            content: messageContent,
            /** Echoed back in the ack or error so the client can match them to a send. */
            clientMessageId: clientMessageId.optional(),
        }),
    }),
    z.object({ type: z.literal("send_direct_message"), payload: z.unknown() }),
    z.object({ type: z.literal("leave_direct_message"), payload: z.unknown() }),
]);

export type ClientFrame = z.infer<typeof clientFrameSchema>;

/**
 * Every frame the server sends. `createdAt` is an ISO string because that is
 * what JSON.stringify does to the Date on the message row.
 */
export const serverFrameSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("new_message"),
        payload: z.object({
            id: z.string(),
            channelId: z.string(),
            senderId: z.string(),
            senderUsername: z.string(),
            senderAvatarId: z.string().nullable(),
            content: z.string(),
            /** Null when the sender did not supply one. Other tabs use it to settle a pending copy. */
            clientMessageId: z.string().nullable(),
            createdAt: z.string(),
        }),
    }),
    z.object({
        type: z.literal("join_channel_ack"),
        message: z.string(),
        channelId: z.string(),
    }),
    z.object({
        type: z.literal("leave_channel_ack"),
        channelId: z.string(),
    }),
    z.object({
        type: z.literal("send_message_ack"),
        channelId: z.string(),
        messageId: z.string(),
        clientMessageId: z.string().optional(),
    }),
    z.object({
        type: z.literal("removed_from_channel"),
        channelId: z.string(),
    }),
    z.object({
        type: z.literal("channel_deleted"),
        channelId: z.string(),
    }),
    /** Sent once per connection: the socket now receives every one of these channels. */
    z.object({
        type: z.literal("subscribed"),
        channelIds: z.array(z.string()),
    }),
    /** The user joined more channels while connected, and the socket receives them too. */
    z.object({
        type: z.literal("channels_added"),
        channelIds: z.array(z.string()),
    }),
    z.object({
        type: z.literal("error"),
        code: z.string(),
        message: z.string(),
        clientMessageId: z.string().optional(),
        retryAfterSeconds: z.number().optional(),
    }),
]);

export type ServerFrame = z.infer<typeof serverFrameSchema>;

/** Largest frame the server reads. A 4000 character message is well under this. */
export const MAX_FRAME_BYTES = 16 * 1024;

/** Close code the client treats as "your session is gone, do not reconnect". */
export const CLOSE_SESSION_ENDED = 4401;
