import { z } from "zod";
import { clientMessageId, messageContent } from "../types/request.schema";

const id = z.string().min(1).max(64);

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

/** Largest frame the server reads. A 4000 character message is well under this. */
export const MAX_FRAME_BYTES = 16 * 1024;
