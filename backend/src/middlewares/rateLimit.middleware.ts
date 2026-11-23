import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest, RateLimitResult } from "../types/index.js";
import { env } from "../config/env.js";
import { hashToken } from "../utils/crypto.js";
import { supabaseRequest } from "../utils/supabase.js";
import { ApiError } from "../utils/apiError.js";
import type { Request } from "express";

function getClientIp(req: AuthenticatedRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

async function consumeBucket(bucketKey: string): Promise<RateLimitResult> {
  const { rateLimitMaxRequests, rateLimitWindowSeconds } = env.security;

  try {
    const result = await supabaseRequest<RateLimitResult[]>("rpc/consume_chat_rate_limit", {
      method: "POST",
      body: {
        p_bucket_key: bucketKey,
        p_max_requests: rateLimitMaxRequests,
        p_window_seconds: rateLimitWindowSeconds,
      },
    });

    if (Array.isArray(result) && result[0]) {
      return result[0];
    }
  } catch (err) {
    // Graceful in-memory rate limiter fallback if RPC is not deployed in Supabase
    const now = Date.now();
    const windowMs = rateLimitWindowSeconds * 1000;
    const bucket = inMemoryBuckets.get(bucketKey);

    if (!bucket || now > bucket.resetAt) {
      inMemoryBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: rateLimitMaxRequests - 1,
        reset_at: new Date(now + windowMs).toISOString(),
      };
    }

    if (bucket.count >= rateLimitMaxRequests) {
      return {
        allowed: false,
        remaining: 0,
        reset_at: new Date(bucket.resetAt).toISOString(),
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      remaining: rateLimitMaxRequests - bucket.count,
      reset_at: new Date(bucket.resetAt).toISOString(),
    };
  }

  return {
    allowed: true,
    remaining: rateLimitMaxRequests,
    reset_at: new Date(Date.now() + 60000).toISOString(),
  };
}

/** Shared IP limiter for public widget and credential endpoints. */
export async function publicRateLimiter(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip || req.socket.remoteAddress || "unknown").trim();
    const buckets = [`ip:${hashToken(ip)}`];
    const sessionToken = typeof req.body?.sessionToken === "string" ? req.body.sessionToken : "";
    if (sessionToken) buckets.push(`session:${hashToken(sessionToken)}`);
    const limits = await Promise.all(buckets.map(consumeBucket));
    const blocked = limits.filter((limit) => !limit.allowed);
    if (!blocked.length) return next();
    const retryAfter = Math.max(1, ...blocked.map((limit) => Math.ceil((Date.parse(limit.reset_at) - Date.now()) / 1000)));
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait before trying again.", retryAfter);
  } catch (error) { next(error); }
}

/**
 * Atomic Database Rate Limiter Middleware
 * Uses PostgreSQL RPC function to track requests atomically across distributed instances.
 */
export async function rateLimiter(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionHash = req.sessionTokenHash || "anonymous";
    const clientIp = getClientIp(req);
    const ipHash = hashToken(clientIp);

    // Concurrently consume both session and IP buckets
    const [sessionLimit, ipLimit] = await Promise.all([
      consumeBucket(`session:${sessionHash}`),
      consumeBucket(`ip:${ipHash}`),
    ]);

    const blocked = [sessionLimit, ipLimit].filter((b) => !b.allowed);
    if (blocked.length === 0) {
      return next();
    }

    const resetTimes = blocked.map((b) => Date.parse(b.reset_at));
    const retryAt = Math.max(...resetTimes);
    const retryAfter = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));

    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many messages sent. Please wait a moment before trying again.",
      retryAfter
    );
  } catch (error) {
    next(error);
  }
}

