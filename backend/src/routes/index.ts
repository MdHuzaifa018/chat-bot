import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { sessionRouter } from "./session.routes.js";
import { chatRouter } from "./chat.routes.js";
import { configRouter } from "./config.routes.js";
import { authRouter } from "./auth.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/session", sessionRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/config", configRouter);
apiRouter.use("/auth", authRouter);
