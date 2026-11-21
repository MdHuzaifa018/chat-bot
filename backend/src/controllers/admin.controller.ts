import type { Request, Response, NextFunction } from "express";
import { supabaseRequest } from "../utils/supabase.js";
import { env } from "../config/env.js";

export class AdminController {
  /**
   * GET /api/admin/overview
   * Returns platform-wide statistics for Super Admin
   */
  static async getOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await supabaseRequest<any[]>("users?select=id,email,name,role,created_at&order=created_at.desc&limit=50");
      const websites = await supabaseRequest<any[]>("websites?select=id,name,url,domain,crawl_status,created_at&order=created_at.desc&limit=50");
      const chatbots = await supabaseRequest<any[]>("chatbot_configs?select=id,public_chatbot_id,chatbot_name,is_published,created_at");
      const convos = await supabaseRequest<any[]>("widget_conversations?select=id,created_at&limit=500");

      res.status(200).json({
        data: {
          stats: {
            totalUsers: users?.length || 0,
            totalWebsites: websites?.length || 0,
            totalChatbots: chatbots?.length || 0,
            totalConversations: convos?.length || 0,
            geminiStatus: env.gemini.isConfigured ? "Connected" : "Not Configured",
            geminiModel: env.gemini.model,
          },
          users: users || [],
          websites: websites || [],
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
