import express from "express"
import cookieParser from "cookie-parser";
import { env } from "./utils/env";
import { appRouter } from "./routes";
import { setupWebSocket } from "./socket";
import cors from "cors";
import { securityHeaders } from "./utils/security-headers";
import { rejectCrossSiteWrites } from "./utils/csrf";

const app = express();
const server = setupWebSocket(app);

// Do not announce the framework, and only believe X-Forwarded-For from a proxy we were told about.
app.disable("x-powered-by");
app.set("trust proxy", env.trustProxy);

app.use(securityHeaders);
app.use(express.json());
app.use(cors({
    origin: env.clientOrigins,
    credentials: true,
}));
// After CORS, so preflights still get their headers. Before every route that changes data.
app.use(rejectCrossSiteWrites);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

app.use(cookieParser());
app.use(appRouter);

server.listen(env.PORT, () => {
    console.log(`Server is running at http://localhost:${env.PORT}`);
    console.log(`CORS origins: ${env.clientOrigins.join(", ")}`);
})
