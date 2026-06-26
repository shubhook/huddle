import { createServer, IncomingMessage } from "http";
import { type Express } from "express";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";

import { env } from "../utils/env";
import type { tokenPayload } from "../utils/auth";

interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
}

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
                console.log(
                    `Message from user ${ws.userId}:`,
                    data.toString()
                );

                ws.send(`echo: ${data}`);
            });

            ws.on("close", () => {
                console.log(`User ${ws.userId} disconnected`);
            });

            ws.on("error", console.error);
        }
    );

    return server;
}