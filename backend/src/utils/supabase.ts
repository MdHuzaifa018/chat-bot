import { env } from "../config/env.js";
import { ApiError } from "./apiError.js";

interface SupabaseRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
  timeoutMs?: number;
}

/**
 * Lightweight, direct PostgREST client for Supabase.
 * Executes server-side queries via HTTP using the SUPABASE_SERVICE_ROLE_KEY.
 */
export async function supabaseRequest<T>(
  resource: string,
  options: SupabaseRequestOptions = {}
): Promise<T> {
  const { url, serviceRoleKey } = env.supabase;
  const timeoutMs = options.timeoutMs ?? 10000;

  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/${resource}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError(503, "DATABASE_UNAVAILABLE", "The database is temporarily unreachable.");
  }

  if (!response.ok) {
    let databaseCode = "";
    try {
      const errorBody = await response.json() as { code?: string };
      databaseCode = errorBody.code || "";
    } catch {
      // The response may not contain JSON.
    }
    const resourceName = resource.split("?")[0];
    console.error(`[Supabase] ${options.method ?? "GET"} ${resourceName} failed (${response.status}${databaseCode ? ` ${databaseCode}` : ""}).`);
    if (databaseCode === "PGRST205" || databaseCode === "42P01") {
      throw new ApiError(503, "DATABASE_SCHEMA_NOT_READY", "A required Supabase table is missing. Apply all database migrations, then restart the backend.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(503, "DATABASE_AUTH_FAILED", "Supabase rejected the server key. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    throw new ApiError(503, "DATABASE_ERROR", "The database operation failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(503, "DATABASE_ERROR", "The database returned an unexpected response.");
  }
}
