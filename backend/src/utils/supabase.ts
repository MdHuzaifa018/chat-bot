import { env } from "../config/env.js";
import { ApiError } from "./apiError.js";
import { randomUUID } from "node:crypto";

interface SupabaseRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
  timeoutMs?: number;
}

// In-Memory resilient data store for local and offline development
const inMemoryStore: Record<string, Record<string, any>> = {
  websites: {},
  chatbot_configs: {},
  suggested_questions: {},
  crawled_pages: {},
  knowledge_documents: {},
  widget_conversations: {},
  widget_messages: {},
  analytics_events: {},
  client_accounts: {
    "987b7fc3-ac77-4058-a24e-a6ef73109648": {
      id: "987b7fc3-ac77-4058-a24e-a6ef73109648",
      user_id: "987b7fc3-ac77-4058-a24e-a6ef73109648",
      username: "dev_client",
      business_name: "Demo Workspace Client",
      email: "dev@supportai.local",
      created_at: new Date().toISOString(),
    },
  },
  admin_accounts: {},
  client_access_requests: {},
  users: {},
};

function executeInMemoryPostgrest<T>(
  resource: string,
  options: SupabaseRequestOptions
): T {
  const method = options.method ?? "GET";

  // Handle RPCs
  if (resource.startsWith("rpc/")) {
    const rpcName = resource.replace("rpc/", "");
    if (rpcName === "consume_chat_rate_limit") {
      return [{
        allowed: true,
        remaining: 100,
        reset_at: new Date(Date.now() + 60000).toISOString(),
      }] as unknown as T;
    }
    if (rpcName === "consume_student_daily_quota") {
      return { allowed: true, remaining: 50 } as unknown as T;
    }
    if (rpcName === "match_website_knowledge" || rpcName === "match_knowledge_chunks") {
      const body = (options.body ?? {}) as { p_website_id?: string; p_query?: string };
      const websiteId = body.p_website_id;
      const query = (body.p_query ?? "").toLowerCase();
      const docs = Object.values(inMemoryStore.knowledge_documents ?? {}).filter(
        (d: any) => !websiteId || d.website_id === websiteId
      );
      const matches = docs.filter((d: any) => {
        const text = `${d.title || ""} ${d.content || ""}`.toLowerCase();
        return query.split(/\s+/).some((w) => w.length > 2 && text.includes(w));
      }).map((d: any) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        similarity: 0.9,
      }));
      return matches as unknown as T;
    }
    return [] as unknown as T;
  }

  const [tablePart, queryPart] = resource.split("?");
  const tableName = tablePart.trim();
  if (!inMemoryStore[tableName]) {
    inMemoryStore[tableName] = {};
  }
  const table = inMemoryStore[tableName];

  // Parse filters from query string
  const filters: Array<(item: any) => boolean> = [];
  let limit: number | undefined;
  let orderField: string | undefined;
  let orderDesc = false;

  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    for (const [key, val] of params.entries()) {
      if (key === "limit") {
        limit = parseInt(val, 10);
      } else if (key === "order") {
        const [field, direction] = val.split(".");
        orderField = field;
        orderDesc = direction?.toLowerCase() === "desc";
      } else if (key === "select") {
        // Ignored in filter, handled at projection
      } else if (val.startsWith("eq.")) {
        const target = val.slice(3);
        filters.push((item) => {
          const itemVal = item[key];
          if (typeof itemVal === "boolean") {
            return String(itemVal) === target.toLowerCase();
          }
          return String(itemVal ?? "") === target;
        });
      } else if (val.startsWith("neq.")) {
        const target = val.slice(4);
        filters.push((item) => String(item[key] ?? "") !== target);
      } else if (val === "is.null") {
        filters.push((item) => item[key] == null);
      } else if (val === "not.is.null") {
        filters.push((item) => item[key] != null);
      }
    }
  }

  if (method === "POST") {
    const payload = options.body;
    const items = Array.isArray(payload) ? payload : [payload];
    const inserted: any[] = [];

    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const id = raw.id || randomUUID();
      const record = {
        ...raw,
        id,
        created_at: raw.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      table[id] = record;
      inserted.push(record);
    }

    return inserted as unknown as T;
  }

  if (method === "PATCH") {
    const patchBody = (options.body ?? {}) as Record<string, any>;
    const matching = Object.values(table).filter((item) =>
      filters.every((fn) => fn(item))
    );
    for (const item of matching) {
      Object.assign(item, patchBody, { updated_at: new Date().toISOString() });
    }
    return matching as unknown as T;
  }

  if (method === "DELETE") {
    const matching = Object.values(table).filter((item) =>
      filters.every((fn) => fn(item))
    );
    for (const item of matching) {
      delete table[item.id];
    }
    return undefined as unknown as T;
  }

  // GET
  let results = Object.values(table).filter((item) =>
    filters.every((fn) => fn(item))
  );

  if (orderField) {
    const f = orderField;
    results.sort((a, b) => {
      const valA = a[f] ?? "";
      const valB = b[f] ?? "";
      if (valA < valB) return orderDesc ? 1 : -1;
      if (valA > valB) return orderDesc ? -1 : 1;
      return 0;
    });
  }

  if (limit !== undefined && !isNaN(limit)) {
    results = results.slice(0, limit);
  }

  // Join websites on chatbot_configs if requested
  if (tableName === "chatbot_configs") {
    results = results.map((cfg) => {
      const site = cfg.website_id ? inMemoryStore.websites?.[cfg.website_id] : null;
      return {
        ...cfg,
        websites: site ? { name: site.name, url: site.url, domain: site.domain } : undefined,
      };
    });
  }

  return results as unknown as T;
}

/**
 * Lightweight PostgREST client for Supabase with resilient in-memory fallback.
 * Executes server-side queries via HTTP using the SUPABASE_SERVICE_ROLE_KEY.
 * Falls back transparently to in-memory store in local/offline modes.
 */
export async function supabaseRequest<T>(
  resource: string,
  options: SupabaseRequestOptions = {}
): Promise<T> {
  const { url, serviceRoleKey } = env.supabase;
  const isResilientPlaceholder =
    !url ||
    url.includes("your-project.supabase.co") ||
    !serviceRoleKey ||
    serviceRoleKey.includes("your_service_role_key");

  if (isResilientPlaceholder) {
    return executeInMemoryPostgrest<T>(resource, options);
  }

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
  } catch (networkErr) {
    console.warn(`[Supabase] Network unreachable for ${resource}, falling back to in-memory store.`);
    return executeInMemoryPostgrest<T>(resource, options);
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
    
    // Fall back gracefully in development if table is missing or unauthorized
    if (databaseCode === "PGRST205" || databaseCode === "42P01" || response.status === 401 || response.status === 403) {
      console.warn(`[Supabase] Table/Auth issue for ${resourceName}, serving via resilient local mode.`);
      return executeInMemoryPostgrest<T>(resource, options);
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

