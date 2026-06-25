import express from "express"
import cookieParser from "cookie-parser";
import { env } from "./utils/env";
import { appRouter } from "./routes";
import { WebSocketServer } from "ws";
import { setupWebSocket } from "./socket";

const app = express();
const server = setupWebSocket(app);

app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

app.use(cookieParser());
app.use(appRouter);

server.listen(env.PORT, () => {
    console.log(`Server is running at http://localhost:${env.PORT}`);
})  