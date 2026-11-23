import { ApiError } from "../utils/apiError.js";
import { generateSessionToken, hashToken } from "../utils/crypto.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { supabaseRequest } from "../utils/supabase.js";

const SESSION_DAYS = 7;

export interface AdminPermissions {
  acceptRequests: boolean;
  rejectRequests: boolean;
  viewTelemetry: boolean;
  manageWebsites: boolean;
  manageTeam: boolean;
}

export type AccountSession =
  | {
      accountType: "client";
      id: string;
      userId: string;
      username: string;
      name: string;
      email: string;
    }
  | {
      accountType: "admin";
      id: string;
      email: string;
      name: string;
      role: "super_admin" | "admin" | "staff";
      permissions: AdminPermissions;
    };

interface AdminRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: "super_admin" | "admin" | "staff";
  permissions: AdminPermissions;
  is_active: boolean;
}

interface ClientRow {
  id: string;
  user_id: string;
  username: string;
  access_code_hash: string;
  email: string;
  business_name: string;
  is_active: boolean;
}

export class AccountAuthService {
  static async bootstrapFirstAdmin(email: string, password: string): Promise<void> {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password || password.length < 12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return;
    }

    try {
      const admins = await supabaseRequest<Array<{ id: string }>>(
        "admin_accounts?select=id&limit=1"
      );
      if (admins.length > 0) return;

      await supabaseRequest("admin_accounts", {
        method: "POST",
        prefer: "return=minimal",
        body: {
          email: normalizedEmail,
          name: normalizedEmail.split("@")[0],
          password_hash: await hashPassword(password),
          role: "super_admin",
          permissions: {
            acceptRequests: true,
            rejectRequests: true,
            viewTelemetry: true,
            manageWebsites: true,
            manageTeam: true,
          },
        },
      });
    } catch (err) {
      console.warn("[AdminBootstrap] Skipping legacy admin_accounts bootstrap (Supabase Auth active or table unmigrated).");
    }
  }

  static async loginAdmin(email: string, password: string): Promise<{ account: AccountSession; token: string }> {
    const rows = await supabaseRequest<AdminRow[]>(
      `admin_accounts?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&is_active=eq.true&limit=1`
    );
    const row = rows[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    const account: AccountSession = {
      accountType: "admin",
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      permissions: row.permissions,
    };
    return { account, token: await this.createSession("admin", row.id) };
  }

  static async loginClient(username: string, accessCode: string): Promise<{ account: AccountSession; token: string }> {
    const rows = await supabaseRequest<ClientRow[]>(
      `client_accounts?username=eq.${encodeURIComponent(username.trim())}&is_active=eq.true&limit=1`
    );
    const row = rows[0];
    if (!row || !(await verifyPassword(accessCode, row.access_code_hash))) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Username or access code is incorrect.");
    }

    const account: AccountSession = {
      accountType: "client",
      id: row.id,
      userId: row.user_id,
      username: row.username,
      name: row.business_name,
      email: row.email,
    };
    return { account, token: await this.createSession("client", row.id) };
  }

  static async createSession(type: "admin" | "client", accountId: string): Promise<string> {
    const token = generateSessionToken();
    await supabaseRequest("account_sessions", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        token_hash: hashToken(token),
        admin_account_id: type === "admin" ? accountId : null,
        client_account_id: type === "client" ? accountId : null,
        expires_at: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    return token;
  }

  static async resolveSession(token: string): Promise<AccountSession | null> {
    const tokenHash = hashToken(token);
    const sessions = await supabaseRequest<Array<{
      admin_account_id: string | null;
      client_account_id: string | null;
    }>>(
      `account_sessions?token_hash=eq.${tokenHash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`
    );
    const session = sessions[0];
    if (!session) return null;

    if (session.admin_account_id) {
      const rows = await supabaseRequest<AdminRow[]>(
        `admin_accounts?id=eq.${session.admin_account_id}&is_active=eq.true&limit=1`
      );
      const row = rows[0];
      return row ? {
        accountType: "admin",
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        permissions: row.permissions,
      } : null;
    }

    if (session.client_account_id) {
      const rows = await supabaseRequest<ClientRow[]>(
        `client_accounts?id=eq.${session.client_account_id}&is_active=eq.true&limit=1`
      );
      const row = rows[0];
      return row ? {
        accountType: "client",
        id: row.id,
        userId: row.user_id,
        username: row.username,
        name: row.business_name,
        email: row.email,
      } : null;
    }

    return null;
  }

  static async revokeSession(token: string): Promise<void> {
    await supabaseRequest<undefined>(`account_sessions?token_hash=eq.${hashToken(token)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  }

  static async submitAccessRequest(input: {
    businessName: string;
    contactName: string;
    email: string;
    websiteUrl: string;
  }): Promise<string> {
    const businessName = input.businessName.trim();
    const contactName = input.contactName.trim();
    const email = input.email.trim().toLowerCase();
    let websiteUrl: URL;
    try {
      websiteUrl = new URL(input.websiteUrl.startsWith("http") ? input.websiteUrl : `https://${input.websiteUrl}`);
    } catch {
      throw new ApiError(400, "INVALID_WEBSITE_URL", "Enter a valid website URL.");
    }
    if (!businessName || !contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "INVALID_REQUEST", "Business name, contact name, and a valid email are required.");
    }
    if (!["http:", "https:"].includes(websiteUrl.protocol)) {
      throw new ApiError(400, "INVALID_WEBSITE_URL", "Website URL must use HTTP or HTTPS.");
    }

    const existing = await supabaseRequest<Array<{ id: string }>>(
      `client_access_requests?email=eq.${encodeURIComponent(email)}&status=eq.pending&limit=1`
    );
    if (existing.length) return existing[0].id;

    const rows = await supabaseRequest<Array<{ id: string }>>("client_access_requests", {
      method: "POST",
      prefer: "return=representation",
      body: {
        business_name: businessName,
        contact_name: contactName,
        email,
        website_url: websiteUrl.href,
      },
    });
    if (!rows[0]?.id) throw new ApiError(503, "REQUEST_FAILED", "Could not submit the access request.");
    return rows[0].id;
  }
}
