import { WebSocketServer } from "ws";
import { createServer }  from "http";
import { type Express } from "express";

export function setupWebSocket(app: Express) {
    const server = createServer(app);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        console.log("client connected from", req.socket.remoteAddress);
        ws.on('message', (data) => ws.send(`echo: ${data}`));
        ws.on('close', () => console.log("client disconnected"));
    });

    return server;
}