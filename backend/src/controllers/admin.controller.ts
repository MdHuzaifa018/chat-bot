import type { Response, NextFunction } from "express";
import type { AdminPermissions } from "../services/accountAuth.service.js";
import type { AccountAuthRequest } from "../middlewares/accountAuth.middleware.js";
import { ApiError } from "../utils/apiError.js";
import { generateAccessCode, generateTemporaryPassword, hashPassword } from "../utils/password.js";
import { supabaseRequest } from "../utils/supabase.js";
import { env } from "../config/env.js";

const PERMISSION_KEYS: Array<keyof AdminPermissions> = [
  "acceptRequests", "rejectRequests", "viewTelemetry", "manageWebsites", "manageTeam",
];

interface RequestRow {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  website_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

function shapeRequest(row: RequestRow) {
  return {
    id: row.id,
    businessName: row.business_name,
    contactName: row.contact_name,
    email: row.email,
    websiteUrl: row.website_url,
    submittedAt: row.created_at,
    status: row.status,
  };
}

function normalizedPermissions(input: unknown): AdminPermissions {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, source[key] === true])) as unknown as AdminPermissions;
}

export class AdminController {
  static async getOverview(_req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [users, websites, chatbots, conversations, requests, messages] = await Promise.all([
        supabaseRequest<Array<Record<string, unknown>>>("client_accounts?select=id,email,business_name,username,created_at&order=created_at.desc&limit=1000"),
        supabaseRequest<Array<Record<string, unknown>>>("websites?select=id,name,url,domain,crawl_status,created_at,last_crawled_at&order=created_at.desc&limit=1000"),
        supabaseRequest<Array<Record<string, unknown>>>("chatbot_configs?select=id,public_chatbot_id,chatbot_name,is_published&limit=1000"),
        supabaseRequest<Array<Record<string, unknown>>>("widget_conversations?select=id,created_at&limit=5000"),
        supabaseRequest<Array<{ id: string; status: string; created_at: string }>>("client_access_requests?select=id,status,created_at&order=created_at.desc&limit=1000"),
        supabaseRequest<Array<{ id: string }>>("widget_messages?select=id&limit=10000").catch(() => []),
      ]);

      const now = Date.now();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const websitesThisWeek = websites.filter(
        (w) => w.created_at && now - new Date(w.created_at as string).getTime() <= oneWeekMs
      ).length;

      const pendingRequests = requests.filter((r) => r.status === "pending").length;
      const rejectedRequests = requests.filter((r) => r.status === "rejected").length;
      const acceptedRequests = requests.filter((r) => r.status === "approved" || r.status === "accepted").length;

      res.status(200).json({
        data: {
          stats: {
            totalUsers: users.length,
            totalWebsites: websites.length,
            totalChatbots: chatbots.length,
            totalConversations: conversations.length,
            totalMessages: Array.isArray(messages) ? messages.length : 0,
            pendingRequests,
            rejectedRequests,
            acceptedRequests,
            totalRequests: requests.length,
            websitesThisWeek,
            geminiStatus: env.gemini.isConfigured ? "Connected" : "Not configured",
            geminiModel: env.gemini.model,
            uptimeSeconds: Math.floor(process.uptime()),
          },
          users,
          websites,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listRequests(_req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await supabaseRequest<RequestRow[]>(
        "client_access_requests?select=id,business_name,contact_name,email,website_url,status,created_at&order=created_at.desc&limit=500"
      );
      res.status(200).json({ data: rows.map(shapeRequest) });
    } catch (error) {
      next(error);
    }
  }

  static async approveRequest(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = String(req.params.id);
      const rows = await supabaseRequest<RequestRow[]>(
        `client_access_requests?id=eq.${encodeURIComponent(requestId)}&select=id,business_name,contact_name,email,website_url,status,created_at&limit=1`
      );
      const request = rows[0];
      if (!request) throw new ApiError(404, "REQUEST_NOT_FOUND", "Access request not found.");
      if (request.status !== "pending") throw new ApiError(409, "REQUEST_ALREADY_REVIEWED", "This request has already been reviewed.");

      const existing = await supabaseRequest<Array<{ id: string }>>(
        `client_accounts?email=eq.${encodeURIComponent(request.email)}&select=id&limit=1`
      );
      if (existing.length) throw new ApiError(409, "ACCOUNT_EXISTS", "An account already exists for this email.");

      const userRows = await supabaseRequest<Array<{ id: string }>>("users?on_conflict=email&select=id", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: [{ email: request.email, name: request.contact_name, role: "owner" }],
      });
      const userId = userRows[0]?.id;
      if (!userId) throw new ApiError(503, "ACCOUNT_CREATE_FAILED", "Could not create the client profile.");

      const baseUsername = request.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) || request.email.split("@")[0];
      let username = baseUsername;
      for (let suffix = 2; (await supabaseRequest<Array<{ id: string }>>(`client_accounts?username=eq.${encodeURIComponent(username)}&select=id&limit=1`)).length; suffix += 1) {
        username = `${baseUsername}_${suffix}`;
      }

      const accessCode = generateAccessCode();
      await supabaseRequest("client_accounts", {
        method: "POST",
        prefer: "return=minimal",
        body: {
          user_id: userId,
          username,
          access_code_hash: await hashPassword(accessCode),
          email: request.email,
          business_name: request.business_name,
        },
      });
      await supabaseRequest(`client_access_requests?id=eq.${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: { status: "approved", reviewed_by: req.account?.id, reviewed_at: new Date().toISOString() },
      });

      res.status(200).json({ data: { username, accessCode, email: request.email } });
    } catch (error) {
      next(error);
    }
  }

  static async rejectRequest(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = String(req.params.id);
      const rows = await supabaseRequest<Array<{ id: string; status: string }>>(
        `client_access_requests?id=eq.${encodeURIComponent(requestId)}&select=id,status&limit=1`
      );
      if (!rows[0]) throw new ApiError(404, "REQUEST_NOT_FOUND", "Access request not found.");
      if (rows[0].status !== "pending") throw new ApiError(409, "REQUEST_ALREADY_REVIEWED", "This request has already been reviewed.");
      await supabaseRequest(`client_access_requests?id=eq.${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: { status: "rejected", reviewed_by: req.account?.id, reviewed_at: new Date().toISOString() },
      });
      res.status(200).json({ data: { id: requestId, status: "rejected" } });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRequest(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = String(req.params.id);
      await supabaseRequest(`client_access_requests?id=eq.${encodeURIComponent(requestId)}`, {
        method: "DELETE",
        prefer: "return=minimal",
      });
      res.status(200).json({ data: { id: requestId, deleted: true } });
    } catch (error) {
      next(error);
    }
  }

  static async resetClientAccessCode(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = String(req.body?.identifier ?? "").trim();
      if (!identifier) {
        throw new ApiError(400, "IDENTIFIER_REQUIRED", "Email or username is required.");
      }

      const rows = await supabaseRequest<Array<{ id: string; username: string; email: string }>>(
        `client_accounts?or=(email.eq.${encodeURIComponent(identifier)},username.eq.${encodeURIComponent(identifier)})&select=id,username,email&limit=1`
      );
      const client = rows[0];
      if (!client) {
        throw new ApiError(404, "CLIENT_NOT_FOUND", "Client account not found.");
      }

      const accessCode = generateAccessCode();
      const accessCodeHash = await hashPassword(accessCode);

      await supabaseRequest(`client_accounts?id=eq.${encodeURIComponent(client.id)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: { access_code_hash: accessCodeHash },
      });

      res.status(200).json({
        data: {
          username: client.username,
          accessCode,
          email: client.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listEmployees(_req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await supabaseRequest<Array<Record<string, unknown>>>(
        "admin_accounts?select=id,email,name,role,job_title,permissions,is_active,created_at&order=created_at.asc&limit=500"
      );
      res.status(200).json({ data: rows });
    } catch (error) {
      next(error);
    }
  }

  static async createEmployee(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const name = String(req.body?.name ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const jobTitle = String(req.body?.role ?? "Team Member").trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ApiError(400, "INVALID_EMPLOYEE", "A name and valid email are required.");
      }

      const temporaryPassword = generateTemporaryPassword();
      const rows = await supabaseRequest<Array<Record<string, unknown>>>("admin_accounts", {
        method: "POST",
        prefer: "return=representation",
        body: {
          name,
          email,
          job_title: jobTitle,
          password_hash: await hashPassword(temporaryPassword),
          role: "staff",
          permissions: normalizedPermissions({ acceptRequests: true }),
        },
      });
      res.status(201).json({ data: { ...rows[0], temporaryPassword } });
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployeePermissions(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const existing = await supabaseRequest<Array<{ id: string; role: string }>>(
        `admin_accounts?id=eq.${encodeURIComponent(id)}&select=id,role&limit=1`
      );
      if (!existing[0]) throw new ApiError(404, "EMPLOYEE_NOT_FOUND", "Team member not found.");
      if (existing[0].role === "super_admin") throw new ApiError(403, "CANNOT_EDIT_SUPER_ADMIN", "The primary administrator cannot be edited here.");

      const rows = await supabaseRequest<Array<Record<string, unknown>>>(`admin_accounts?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        prefer: "return=representation",
        body: { permissions: normalizedPermissions(req.body?.permissions) },
      });
      res.status(200).json({ data: rows[0] });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEmployee(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const existing = await supabaseRequest<Array<{ id: string; role: string }>>(
        `admin_accounts?id=eq.${encodeURIComponent(id)}&select=id,role&limit=1`
      );
      if (!existing[0]) throw new ApiError(404, "EMPLOYEE_NOT_FOUND", "Team member not found.");
      if (existing[0].role === "super_admin") throw new ApiError(403, "CANNOT_DELETE_SUPER_ADMIN", "The primary administrator cannot be deleted here.");

      await supabaseRequest(`admin_accounts?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH", prefer: "return=minimal", body: { is_active: false },
      });
      await supabaseRequest<undefined>(`account_sessions?admin_account_id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE", prefer: "return=minimal",
      });
      res.status(200).json({ data: { id, is_active: false } });
    } catch (error) {
      next(error);
    }
  }
}
