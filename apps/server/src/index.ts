import express from "express"
import { env } from "./utils/env";
import { appRouter } from "./routes";

const app = express();

app.use(express());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

app.use(appRouter);

app.listen(env.PORT, () => {
    console.log(`Server is running at http://localhost:${env.PORT}`);
})