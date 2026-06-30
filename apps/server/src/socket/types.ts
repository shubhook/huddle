import { WebSocket } from "ws"

export type ClientMessage = {
    content: string
    channelId: string
    workspaceId: string
}

export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
}

export type parsedObjectType = {
    type: string,
    payload: { channelId: string, content: string, workspaceId: string }
}