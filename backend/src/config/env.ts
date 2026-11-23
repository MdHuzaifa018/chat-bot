import dotenv from "dotenv";
import { ApiError } from "../utils/apiError.js";

// Load environment variables (.env.local has priority)
dotenv.config({ path: ".env.local" });
dotenv.config();

export interface AppEnv {
  port: number;
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    timeoutMs: number;
    maxOutputTokens: number;
    isConfigured: boolean;
  };
  chatConfig: {
    dailyMessageLimit: number;
    maxMessageLength: number;
  };
  bootstrapAdmin: {
    email: string;
    password: string;
  };
  security: {
    allowedOrigin: string;
    rateLimitMaxRequests: number;
    rateLimitWindowSeconds: number;
    sessionCookieSameSite: "lax" | "strict" | "none";
  };
}

function getRequiredEnv(key: string, description: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new ApiError(503, "CONFIG_ERROR", `${description} (${key}) is missing in .env.local.`);
  }
  return value;
}

export function loadEnv(): AppEnv {
  const port = Number.parseInt(process.env.PORT ?? "5000", 10);

  // Supabase Database Configuration
  const supabaseUrlRaw = process.env.SUPABASE_URL?.trim() || "https://your-project.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "your_service_role_key";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrlRaw);
  } catch {
    parsedUrl = new URL("https://your-project.supabase.co");
  }

  // Google Gemini API Configuration (Direct SDK)
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const geminiTimeoutMs = Number.parseInt(process.env.GEMINI_TIMEOUT_MS ?? "20000", 10);
  const geminiMaxOutputTokens = Number.parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? "450", 10);

  // Chatbot Limits
  const dailyMessageLimit = Number.parseInt(process.env.DAILY_MESSAGE_LIMIT ?? "50", 10);
  const maxMessageLength = Number.parseInt(process.env.MAX_MESSAGE_LENGTH ?? "1000", 10);

  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() ?? "admin@supportai.local";
  const bootstrapAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() ?? "Admin@12345678";

  // Rate Limiting & CORS
  const allowedOrigin = process.env.ALLOWED_ORIGIN?.trim() || "http://localhost:3000";
  const rateLimitMaxRequests = Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "60", 10);
  const rateLimitWindowSeconds = Number.parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60", 10);
  const sessionCookieSameSite = (process.env.SESSION_COOKIE_SAME_SITE?.trim() || "lax").toLowerCase() as "lax" | "strict" | "none";

  const isSupabaseConfigured = Boolean(
    supabaseUrlRaw &&
    !supabaseUrlRaw.includes("your-project") &&
    serviceRoleKey &&
    !serviceRoleKey.includes("your_service_role_key")
  );

  if (!isSupabaseConfigured) {
    console.warn("⚠️ [Config] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is using default placeholder. Running in resilient local mode.");
  }

  return {
    port,
    supabase: {
      url: parsedUrl.origin,
      serviceRoleKey,
    },
    gemini: {
      apiKey: geminiApiKey,
      model: geminiModel,
      timeoutMs: Number.isInteger(geminiTimeoutMs) && geminiTimeoutMs >= 1000 ? geminiTimeoutMs : 20000,
      maxOutputTokens: Number.isInteger(geminiMaxOutputTokens) && geminiMaxOutputTokens > 0 ? geminiMaxOutputTokens : 450,
      isConfigured: Boolean(geminiApiKey && !geminiApiKey.includes("your_gemini_api_key") && !geminiApiKey.includes("your_google_ai_studio_api_key")),
    },
    chatConfig: {
      dailyMessageLimit: Number.isInteger(dailyMessageLimit) && dailyMessageLimit > 0 ? dailyMessageLimit : 50,
      maxMessageLength: Number.isInteger(maxMessageLength) && maxMessageLength > 0 ? maxMessageLength : 1000,
    },
    bootstrapAdmin: {
      email: bootstrapAdminEmail,
      password: bootstrapAdminPassword,
    },
    security: {
      allowedOrigin,
      rateLimitMaxRequests: Number.isInteger(rateLimitMaxRequests) && rateLimitMaxRequests > 0 ? rateLimitMaxRequests : 60,
      rateLimitWindowSeconds: Number.isInteger(rateLimitWindowSeconds) && rateLimitWindowSeconds > 0 ? rateLimitWindowSeconds : 60,
      sessionCookieSameSite: ["lax", "strict", "none"].includes(sessionCookieSameSite) ? sessionCookieSameSite : "lax",
    },
  };
}

export const env = loadEnv();
