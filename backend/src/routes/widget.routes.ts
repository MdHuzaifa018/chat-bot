import { Router } from "express";
import { WidgetController } from "../controllers/widget.controller.js";
import { publicRateLimiter } from "../middlewares/rateLimit.middleware.js";

export const widgetRouter = Router();

// Public widget endpoints accessed by embed scripts on third-party websites
widgetRouter.get("/config", WidgetController.getConfig);
widgetRouter.get("/:publicId/config", WidgetController.getConfig);
widgetRouter.post("/:publicId/session", publicRateLimiter, WidgetController.startSession);
widgetRouter.post("/:publicId/message", publicRateLimiter, WidgetController.sendMessage);
widgetRouter.post("/:publicId/contact", publicRateLimiter, WidgetController.submitContact);
