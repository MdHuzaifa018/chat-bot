import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.js";
import { AccountAuthService, type AccountSession } from "../services/accountAuth.service.js";

export const ACCOUNT_COOKIE_NAME = "supportai_session";

export interface AccountAuthRequest extends Request {
  account?: AccountSession;
}

export async function attachAccount(
  req: AccountAuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace(/^Bearer\s+/, "").trim();
      if (token) {
        // 1. First check SupportAI session token
        try {
          const session = await AccountAuthService.resolveSession(token);
          if (session) {
            req.account = session;
            return next();
          }
        } catch {
          // Continue to Supabase check
        }

        // 2. Supabase JWT token verification
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const { env } = await import("../config/env.js");
          const client = createClient(env.supabase.url, env.supabase.serviceRoleKey);
          const { data: { user } } = await client.auth.getUser(token);
          if (user) {
            req.account = {
              accountType: "client",
              id: user.id,
              userId: user.id,
              username: user.email?.split("@")[0] || "user",
              name: (user.user_metadata?.name as string) || (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "User",
              email: user.email || "",
            };
            return next();
          }
        } catch {
          // Continue to cookie check
        }
      }
    }

    const token = req.cookies?.[ACCOUNT_COOKIE_NAME];
    if (typeof token === "string" && token.length <= 128) {
      req.account = await AccountAuthService.resolveSession(token) ?? undefined;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireClientAuth(req: AccountAuthRequest, _res: Response, next: NextFunction): void {
  if (!req.account || req.account.accountType !== "client") {
    next(new ApiError(401, "CLIENT_AUTH_REQUIRED", "Sign in with your client access code."));
    return;
  }
  next();
}

export function requireAdminAuth(req: AccountAuthRequest, _res: Response, next: NextFunction): void {
  if (!req.account || req.account.accountType !== "admin") {
    next(new ApiError(401, "ADMIN_AUTH_REQUIRED", "Sign in with your administrator account."));
    return;
  }
  next();
}

export function requirePermission(permission: keyof import("../services/accountAuth.service.js").AdminPermissions) {
  return (req: AccountAuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.account || req.account.accountType !== "admin") {
      next(new ApiError(401, "ADMIN_AUTH_REQUIRED", "Administrator access is required."));
      return;
    }
    if (req.account.role !== "super_admin" && !req.account.permissions[permission]) {
      next(new ApiError(403, "PERMISSION_DENIED", "Your account does not have permission for this action."));
      return;
    }
    next();
  };
}

export function requireAnyPermission(permissions: Array<keyof import("../services/accountAuth.service.js").AdminPermissions>) {
  return (req: AccountAuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.account || req.account.accountType !== "admin") {
      next(new ApiError(401, "ADMIN_AUTH_REQUIRED", "Administrator access is required."));
      return;
    }
    if (req.account.role !== "super_admin" && !permissions.some((permission) => req.account?.accountType === "admin" && req.account.permissions[permission])) {
      next(new ApiError(403, "PERMISSION_DENIED", "Your account does not have permission for this action."));
      return;
    }
    next();
  };
}
