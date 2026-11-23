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
      let databaseStatus: "ok" | "unavailable" = "unavailable";

      // Lightweight probe to Supabase PostgREST
      try {
        await supabaseRequest("websites?select=id&limit=1", { timeoutMs: 3500 });
        databaseStatus = "ok";
      } catch {
        databaseStatus = "unavailable";
      }

      const isHealthy = databaseStatus === "ok";
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "ok" : "degraded",
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
