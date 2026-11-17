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
  dify: {
    baseUrl: string;
    apiKey: string;
    appMode: "chat" | "workflow";
    timeoutMs: number;
    workflowInputField: string;
    workflowOutputField: string;
    isConfigured: boolean;
  };
  aiFailover: {
    groqApiKey: string;
    openRouterApiKey: string;
    groqModel: string;
    openRouterModel: string;
    dailyMessageLimit: number;
  };
  clerk: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    isConfigured: boolean;
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

  // Supabase Config
  const supabaseUrlRaw = getRequiredEnv("SUPABASE_URL", "Supabase URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", "Supabase Service Role Key");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrlRaw);
  } catch {
    throw new ApiError(503, "CONFIG_ERROR", "SUPABASE_URL must be a valid URL.");
  }
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== "https:" && !isLocal) {
    throw new ApiError(503, "CONFIG_ERROR", "SUPABASE_URL must use HTTPS.");
  }

  // Dify Config (Primary LLM - Gemini 2.5 Flash)
  const difyBaseUrl = (process.env.DIFY_API_BASE_URL ?? "https://api.dify.ai/v1").trim().replace(/\/+$/, "");
  const difyApiKey = process.env.DIFY_API_KEY?.trim() ?? "";
  const difyAppMode = (process.env.DIFY_APP_MODE?.trim() || "chat") as "chat" | "workflow";
  const difyTimeoutMs = Number.parseInt(process.env.DIFY_TIMEOUT_MS ?? "15000", 10);

  // Failover AI Providers (Groq & OpenRouter)
  const groqApiKey = process.env.GROQ_API_KEY?.trim() ?? "";
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const groqModel = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  const openRouterModel = process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct:free";
  const dailyMessageLimit = Number.parseInt(process.env.DAILY_MESSAGE_LIMIT ?? "8", 10);

  // Clerk Authentication Configuration
  const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const clerkWebhookSecret = process.env.CLERK_WEBHOOK_SECRET?.trim() ?? "";

  // Rate Limiting & CORS
  const allowedOrigin = process.env.ALLOWED_ORIGIN?.trim() || "http://localhost:3000";
  const rateLimitMaxRequests = Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "20", 10);
  const rateLimitWindowSeconds = Number.parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60", 10);
  const sessionCookieSameSite = (process.env.SESSION_COOKIE_SAME_SITE?.trim() || "lax").toLowerCase() as "lax" | "strict" | "none";

  return {
    port,
    supabase: {
      url: parsedUrl.origin,
      serviceRoleKey,
    },
    dify: {
      baseUrl: difyBaseUrl,
      apiKey: difyApiKey,
      appMode: difyAppMode === "workflow" ? "workflow" : "chat",
      timeoutMs: Number.isInteger(difyTimeoutMs) && difyTimeoutMs >= 1000 ? difyTimeoutMs : 15000,
      workflowInputField: process.env.DIFY_WORKFLOW_INPUT_FIELD?.trim() || "query",
      workflowOutputField: process.env.DIFY_WORKFLOW_OUTPUT_FIELD?.trim() || "answer",
      isConfigured: Boolean(difyBaseUrl && difyApiKey && !difyApiKey.includes("your_dify_api_key")),
    },
    aiFailover: {
      groqApiKey,
      openRouterApiKey,
      groqModel,
      openRouterModel,
      dailyMessageLimit: Number.isInteger(dailyMessageLimit) && dailyMessageLimit > 0 ? dailyMessageLimit : 8,
    },
    clerk: {
      secretKey: clerkSecretKey,
      publishableKey: clerkPublishableKey,
      webhookSecret: clerkWebhookSecret,
      isConfigured: Boolean(clerkSecretKey && clerkPublishableKey),
    },
    security: {
      allowedOrigin,
      rateLimitMaxRequests: Number.isInteger(rateLimitMaxRequests) ? rateLimitMaxRequests : 20,
      rateLimitWindowSeconds: Number.isInteger(rateLimitWindowSeconds) ? rateLimitWindowSeconds : 60,
      sessionCookieSameSite: ["lax", "strict", "none"].includes(sessionCookieSameSite) ? sessionCookieSameSite : "lax",
    },
  };
}

export const env = loadEnv();
