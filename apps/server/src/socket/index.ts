import { createServer, IncomingMessage } from "http";
import { type Express } from "express";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";

import { env } from "../utils/env";
import type { tokenPayload } from "../utils/auth";
import { handleJoinChannel, handleLeaveChannel, handleSendMessage, handleSendDirectMessage, handleLeaveDirectMessage } from "./handlers";
import type { parsedObjectType } from "./types";
import type { AuthenticatedWebSocket } from "./types";
import { cleanupSocket } from "./state";

const parseCookies = (cookieString: string) =>
    Object.fromEntries(
        cookieString.split("; ").map((cookie) => {
            const [key, ...value] = cookie.split("=");
            return [key, decodeURIComponent(value.join("="))];
        })
    );

function authenticate(req: IncomingMessage): string {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
        throw new Error("Missing cookie header");
    }

    const cookies = parseCookies(cookieHeader);

    const token = cookies["jwt_token"];

    if (!token) {
        throw new Error("Missing JWT token");
    }

    const payload = jwt.verify(token, env.JwtSecret) as tokenPayload;
    return payload.userId;
}

export function setupWebSocket(app: Express) {
    const server = createServer(app);

    const wss = new WebSocketServer({
        noServer: true,
    });

    server.on("upgrade", (req, socket, head) => {
        try {
            const userId: string = authenticate(req);

            wss.handleUpgrade(req, socket, head, (ws) => {
                (ws as AuthenticatedWebSocket).userId = userId;

                wss.emit("connection", ws, req);
            });
        } catch (err) {
            console.error(err);

            socket.write(
                "HTTP/1.1 401 Unauthorized\r\n\r\n"
            );

            socket.destroy();
        }
    });

    wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
            console.log(
                `User ${ws.userId} connected from ${req.socket.remoteAddress}`
            );

            ws.on("message", (data) => {

                try {
                    const parsedObj: parsedObjectType = JSON.parse(data.toString());

                    const type = parsedObj.type;
                    const payload = parsedObj.payload;

                    switch (type) {
                        case "join_channel":
                            handleJoinChannel(ws, payload, ws.userId)
                            break;

                        case "send_message":
                            handleSendMessage(ws, payload, ws.userId)
                            break;

                        case "send_direct_message":
                            handleSendDirectMessage(ws, payload, ws.userId)
                            break;

                        case "leave_channel":
                            handleLeaveChannel(ws, payload, ws.userId)
                            break;

                        case "leave_direct_message":
                            handleLeaveDirectMessage(ws, payload, ws.userId)
                            break;

                        default:    
                            console.error(`Unknown message type: ${type}`);
                            break;
                    }
                }
                catch(e) {}
                
            });

            ws.on("close", () => {
                cleanupSocket(ws);
                console.log(`User ${ws.userId} disconnected`);
            });

            ws.on("error", console.error);
        }
    );

    return server;
}