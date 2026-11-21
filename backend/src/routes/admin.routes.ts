import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";

export const adminRouter = Router();

adminRouter.get("/overview", AdminController.getOverview);
