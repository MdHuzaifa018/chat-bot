import { Router } from "express";
import {
  adminLogin,
  clientLogin,
  currentAccount,
  getProfile,
  logout,
  submitAccessRequest,
  unifiedLogin,
  updateProfile,
} from "../controllers/auth.controller.js";
import { attachAccount } from "../middlewares/accountAuth.middleware.js";
import { publicRateLimiter } from "../middlewares/rateLimit.middleware.js";

export const authRouter = Router();

authRouter.post("/login", publicRateLimiter, unifiedLogin);
authRouter.post("/client/login", publicRateLimiter, clientLogin);
authRouter.post("/admin/login", publicRateLimiter, adminLogin);
authRouter.post("/client/request-access", publicRateLimiter, submitAccessRequest);
authRouter.get("/me", attachAccount, currentAccount);
authRouter.get("/profile", attachAccount, getProfile);
authRouter.put("/profile", attachAccount, updateProfile);
authRouter.patch("/profile", attachAccount, updateProfile);
authRouter.post("/logout", logout);
