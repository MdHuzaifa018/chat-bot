import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { supabaseRequest } from "../utils/supabase.js";

/**
 * Health Controller
 * Provides deployment verification and dependency status checks.
 */
export class HealthController {
  static async checkHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let databaseStatus: "ok" | "unavailable" | "local_resilient" = "local_resilient";

      // Lightweight probe to Supabase PostgREST
      try {
        await supabaseRequest("websites?select=id&limit=1", { timeoutMs: 2500 });
        databaseStatus = "ok";
      } catch {
        databaseStatus = env.supabase.url.includes("your-project") ? "local_resilient" : "unavailable";
      }

      res.status(200).json({
        status: "ok",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: databaseStatus,
        gemini: env.gemini.isConfigured ? "configured" : "not_configured",
      });
    } catch (error) {
      next(error);
    }
  }
}
