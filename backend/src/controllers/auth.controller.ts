import type { Request, Response, NextFunction } from "express";
import { AccountAuthService } from "../services/accountAuth.service.js";
import { ACCOUNT_COOKIE_NAME, type AccountAuthRequest } from "../middlewares/accountAuth.middleware.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setSessionCookie(res: Response, token: string): void {
  const sameSite = env.security.sessionCookieSameSite;
  res.cookie(ACCOUNT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

function clearSessionCookie(res: Response): void {
  const sameSite = env.security.sessionCookieSameSite;
  res.clearCookie(ACCOUNT_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/",
  });
}

export async function clientLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const username = typeof req.body?.username === "string" ? req.body.username : "";
    const accessCode = typeof req.body?.accessCode === "string" ? req.body.accessCode : "";
    if (!username.trim() || accessCode.length < 15 || accessCode.length > 22) {
      throw new ApiError(400, "INVALID_CREDENTIALS", "Enter a username and a valid 15–22 character access code.");
    }
    const { account, token } = await AccountAuthService.loginClient(username, accessCode);
    setSessionCookie(res, token);
    res.status(200).json({ authenticated: true, account });
  } catch (error) {
    next(error);
  }
}

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email.trim() || !password) {
      throw new ApiError(400, "INVALID_CREDENTIALS", "Enter your administrator email and password.");
    }
    const { account, token } = await AccountAuthService.loginAdmin(email, password);
    setSessionCookie(res, token);
    res.status(200).json({ authenticated: true, account });
  } catch (error) {
    next(error);
  }
}

export async function currentAccount(req: AccountAuthRequest, res: Response): Promise<void> {
  if (!req.account) {
    res.status(401).json({ error: { code: "SESSION_REQUIRED", message: "Sign in to continue." } });
    return;
  }
  res.status(200).json({ authenticated: true, account: req.account });
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[ACCOUNT_COOKIE_NAME];
    if (typeof token === "string") await AccountAuthService.revokeSession(token);
    clearSessionCookie(res);
    res.status(200).json({ authenticated: false });
  } catch (error) {
    next(error);
  }
}

export async function submitAccessRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = await AccountAuthService.submitAccessRequest({
      businessName: String(req.body?.businessName ?? ""),
      contactName: String(req.body?.contactName ?? ""),
      email: String(req.body?.email ?? ""),
      websiteUrl: String(req.body?.websiteUrl ?? ""),
    });
    res.status(201).json({ data: { requestId, status: "pending" } });
  } catch (error) {
    next(error);
  }
}
