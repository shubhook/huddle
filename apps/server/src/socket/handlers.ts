import { WebSocket } from "ws";
import type { ClientFrame } from "./schema";
import type { AuthenticatedWebSocket } from "./types";
import { assertChannelAccess, ChannelAccessError } from "../services/channel-access";
import { sendChannelMessage } from "../services/message.service";
import { sendError, sendFrame, subscribe, unsubscribe } from "./state";

type Payload<T extends ClientFrame["type"]> = Extract<ClientFrame, { type: T }>["payload"];

export async function handleJoinChannel(ws: AuthenticatedWebSocket, payload: Payload<"join_channel">) {
    const { channelId, workspaceId } = payload;

    try {
        await assertChannelAccess(ws.userId, channelId, workspaceId);
    } catch (err) {
        if (err instanceof ChannelAccessError) {
            sendError(ws, err.code, err.message);
            return;
        }
        throw err;
    }

    // The socket may have closed while the checks above were running. Adding it now
    // would leave a dead entry in the subscriber set.
    if (ws.readyState !== WebSocket.OPEN) return;

    subscribe(channelId, ws);
    sendFrame(ws, { type: "join_channel_ack", message: "Successfully joined channel", channelId });
}

export async function handleSendMessage(ws: AuthenticatedWebSocket, payload: Payload<"send_message">) {
    const { channelId, workspaceId, content, clientMessageId } = payload;

    try {
        const message = await sendChannelMessage({
            userId: ws.userId,
            channelId,
            workspaceId,
            content,
        });

        sendFrame(ws, {
            type: "send_message_ack",
            channelId,
            messageId: message.id,
            ...(clientMessageId ? { clientMessageId } : {}),
        });
    } catch (err) {
        if (err instanceof ChannelAccessError) {
            sendError(ws, err.code, err.message, { clientMessageId });
            return;
        }
        throw err;
    }
}

export async function handleLeaveChannel(ws: AuthenticatedWebSocket, payload: Payload<"leave_channel">) {
    unsubscribe(payload.channelId, ws);
    sendFrame(ws, { type: "leave_channel_ack", channelId: payload.channelId });
}

// Direct messages work over REST (POST /dm/:userId). The socket does not carry them yet,
// and it says so instead of pretending the message went out.
const DM_NOT_SUPPORTED = "Direct messages are not available over the socket yet. Use POST /dm/:userId.";

export async function handleSendDirectMessage(ws: AuthenticatedWebSocket) {
    sendError(ws, "not_supported", DM_NOT_SUPPORTED);
}

export async function handleLeaveDirectMessage(ws: AuthenticatedWebSocket) {
    sendError(ws, "not_supported", DM_NOT_SUPPORTED);
}
