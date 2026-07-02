import type WebSocket from "ws";
import type { ClientMessage } from "./types";
import { prisma } from "../db";

import type { AuthenticatedWebSocket } from "./types";
import { channelSubscriptions } from "./state"; 

export async function handleJoinChannel(ws: AuthenticatedWebSocket, payload: ClientMessage, userId: string) {
    try {
        const { channelId, workspaceId } = payload;

        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId
            }
        });

        if (!channel) {
            ws.send(JSON.stringify({ type: "error", message: "Channel not found" }));
            return;
        }

        if (channel.workspaceId !== workspaceId) {
            ws.send(JSON.stringify({ type: "error", message: "Channel does not belong to this workspace" }));
            return;
        }

        const workspaceMember = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: userId,
                    workspaceId: workspaceId
                }
            }
        });

        if (!workspaceMember) {
            ws.send(JSON.stringify({ type: "error", message: "You are not a member of this workspace" }));
            return;
        }

        const channelMembership = await prisma.channelMember.findUnique({
            where: {
                userId_channelId: {
                    userId: userId,
                    channelId: channelId
                }
            }
        });

        if (!channelMembership) {
            ws.send(JSON.stringify({ type: "error", message: "Not a member of this channel" }));
            return;
        }

        let subscribers = channelSubscriptions.get(channelId);
        if (!subscribers) {
            subscribers = new Set<AuthenticatedWebSocket>();
            channelSubscriptions.set(channelId, subscribers);
        }
        subscribers!.add(ws);

        ws.send(JSON.stringify({ type: "join_channel_ack", message: "Successfully joined channel", channelId }));

        // Optionally: Notify other users in the channel if you have a mechanism to do so

    } catch (error) {
        ws.send(JSON.stringify({ type: "error", message: "An unknown error occurred joining the channel" }));
        console.error("handleJoinChannel error:", error);
    }
}

export async function handleSendMessage(ws: WebSocket, payload: ClientMessage, userId: string) {
    // TODO: Implement logic for sending a message to a channel
    ws.send(JSON.stringify({ type: "send_message_ack", message: "Message sent (stub)" }));
}

export async function handleSendDirectMessage(ws: WebSocket, payload: ClientMessage, userId: string) {
    // TODO: Implement logic for sending a direct message
    ws.send(JSON.stringify({ type: "send_direct_message_ack", message: "Direct message sent (stub)" }));
}

export async function handleLeaveChannel(ws: AuthenticatedWebSocket, payload: ClientMessage, userId: string) {
    const { channelId } = payload;
    if (!channelId) {
        ws.send(JSON.stringify({ type: "error", message: "Missing channelId in leave_channel payload" }));
        return;
    }

    let subscribers = channelSubscriptions.get(channelId);
    if (subscribers) {
        subscribers.delete(ws);
        // Optionally, clean up empty sets
        if (subscribers.size === 0) {
            channelSubscriptions.delete(channelId);
        }
    }
    ws.send(JSON.stringify({ type: "leave_channel_ack", message: "Left channel (stub)" }));
}

export async function handleLeaveDirectMessage(ws: WebSocket, payload: ClientMessage, userId: string) {
    // TODO: Implement logic for leaving a direct message
    ws.send(JSON.stringify({ type: "leave_direct_message_ack", message: "Left direct message (stub)" }));
}