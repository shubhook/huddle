import WebSocket from "ws";
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

        // TODO: Notify other users in the channel.

    } catch (error) {
        ws.send(JSON.stringify({ type: "error", message: "An unknown error occurred joining the channel" }));
        console.error("handleJoinChannel error:", error);
    }
}

export async function handleSendMessage(ws: WebSocket, payload: ClientMessage, userId: string) {
    try {
        const { channelId, workspaceId, content } = payload;
        
        if(!content) {
            ws.send(JSON.stringify({ type: "error", message: "Content not found" }))
            return;
        }

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

        const response = await prisma.message.create({
            data:{
                content: content,
                senderId: userId,
                channelId: channelId,
            }
        })

        const subscribers = channelSubscriptions.get(channelId);

        if (subscribers) {
            const messagePayload = {
                type: "new_message",
                payload: {
                    id: response.id,
                    channelId: response.channelId,
                    senderId: response.senderId,
                    content: response.content,
                    createdAt: response.createdAt
                }
            };

            for (const subscriber of subscribers) {
                if (subscriber.readyState === WebSocket.OPEN) {
                    subscriber.send(JSON.stringify(messagePayload));
                }
            }
        }
    }
    catch(error) {
        ws.send(JSON.stringify({ type: "error", message: "An unknown error occurred sending to the channel" }));
        console.error("handleSendMessage error:", error);
    }
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