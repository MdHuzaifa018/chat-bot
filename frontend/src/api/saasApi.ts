export interface Account {
  accountType: "client" | "admin";
  id: string;
  name: string;
  email: string;
  username?: string;
  role?: "super_admin" | "admin" | "staff";
  permissions?: Record<string, boolean>;
}

export interface WebsiteData {
  id: string; name: string; url: string; domain: string;
  crawl_status: "idle" | "in_progress" | "completed" | "failed";
  last_crawled_at?: string; created_at: string;
}
export interface ChatbotConfigData {
  id: string; website_id: string; public_chatbot_id: string;
  chatbot_name: string; welcome_message: string; placeholder_text: string;
  primary_color: string; secondary_color: string; background_color: string;
  text_color: string; font_family: string; logo_url?: string;
  position: "bottom-right" | "bottom-left"; allowed_origins: string[]; is_published: boolean;
}

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
export const API_ORIGIN = API_BASE.replace(/\/api$/, "");

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : null;
}

function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getStoredAuthToken(): string | null {
  return getCookie("supportai_token");
}

export function setStoredAuthToken(token?: string | null): void {
  if (typeof window === "undefined") return;
  // Completely purge legacy localStorage storage to ensure cookies are used
  try {
    localStorage.removeItem("supportai_token");
  } catch {}

  if (token) {
    setCookie("supportai_token", token, 7);
  } else {
    deleteCookie("supportai_token");
  }
}

export async function apiRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `Request failed (${response.status})`);
    return payload as T;
  } catch (err: any) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Cannot connect to SupportAI backend server. Please make sure backend is running on port 5000.");
    }
    throw err;
  }
}

export async function signInClient(username: string, accessCode: string) {
  const res = await apiRequest<{ authenticated: true; account: Account; token?: string }>("/auth/client/login", {
    method: "POST",
    body: JSON.stringify({ username: username.trim(), accessCode: accessCode.trim() }),
  });
  if (res.token) {
    setStoredAuthToken(res.token);
  }
  return res;
}

export async function signInAdmin(email: string, password: string) {
  const res = await apiRequest<{ authenticated: true; account: Account; token?: string }>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (res.token) {
    setStoredAuthToken(res.token);
  }
  return res;
}

export async function fetchCurrentAccount() {
  return apiRequest<{ authenticated: true; account: Account }>("/auth/me");
}

export async function signOut() {
  setStoredAuthToken(null);
  deleteCookie("supportai_session");
  try {
    localStorage.removeItem("supportai_token");
  } catch {}
  return apiRequest("/auth/logout", { method: "POST" });
}
export async function submitAccessRequest(data: { businessName: string; contactName: string; email: string; websiteUrl: string }) {
  return apiRequest("/auth/client/request-access", { method: "POST", body: JSON.stringify(data) });
}
export async function fetchWebsites() { return (await apiRequest<{ data: WebsiteData[] }>("/websites")).data; }
export async function createWebsite(url: string, name?: string) {
  return apiRequest<{ data: any }>("/websites", { method: "POST", body: JSON.stringify({ url, name }) });
}
export async function deleteWebsite(id: string) {
  return (await apiRequest<{ data: any }>(`/admin/websites/${encodeURIComponent(id)}`, { method: "DELETE" })).data;
}
export async function fetchWebsiteDetails(id: string) { return (await apiRequest<{ data: any }>(`/websites/${encodeURIComponent(id)}`)).data; }
export async function updateChatbotConfig(websiteId: string, updates: Partial<ChatbotConfigData>) {
  return (await apiRequest<{ data: ChatbotConfigData }>(`/websites/${encodeURIComponent(websiteId)}/chatbot`, { method: "PATCH", body: JSON.stringify(updates) })).data;
}
export async function updateSuggestedQuestions(websiteId: string, questions: Array<string | { question_text: string; answer?: string }>) {
  return (await apiRequest<{ data: any[] }>(`/websites/${encodeURIComponent(websiteId)}/questions`, { method: "PUT", body: JSON.stringify({ questions }) })).data;
}
export async function recrawlWebsite(websiteId: string) {
  return (await apiRequest<{ data: { pagesCrawled: number } }>(`/websites/${encodeURIComponent(websiteId)}/recrawl`, { method: "POST" })).data;
}
export async function addKnowledgeDoc(websiteId: string, title: string, content: string, sourceType: "manual_doc" | "faq" = "manual_doc") {
  return (await apiRequest<{ data: any }>(`/websites/${encodeURIComponent(websiteId)}/knowledge`, { method: "POST", body: JSON.stringify({ title, content, sourceType }) })).data;
}
export async function fetchAdminOverview() { return (await apiRequest<{ data: any }>("/admin/overview")).data; }
export async function fetchAdminRequests() { return (await apiRequest<{ data: any[] }>("/admin/requests")).data; }
export async function reviewRequest(id: string, decision: "approve" | "reject") {
  return (await apiRequest<{ data: any }>(`/admin/requests/${encodeURIComponent(id)}/${decision}`, { method: "POST" })).data;
}
export async function updateClientRequest(id: string, updates: Record<string, unknown>) {
  return (await apiRequest<{ data: any }>(`/admin/requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  })).data;
}
export async function deleteRequest(id: string) {
  return (await apiRequest<{ data: any }>(`/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE" })).data;
}
export async function resetClientAccessCode(identifier: string) {
  return (await apiRequest<{ data: { username: string; accessCode: string; email: string } }>("/admin/clients/reset-code", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  })).data;
}
export async function fetchEmployees() { return (await apiRequest<{ data: any[] }>("/admin/employees")).data; }
export async function createEmployee(data: { name: string; email: string; role: string }) {
  return (await apiRequest<{ data: any }>("/admin/employees", { method: "POST", body: JSON.stringify(data) })).data;
}
export async function updateEmployee(id: string, updates: Record<string, unknown>) {
  return (await apiRequest<{ data: any }>(`/admin/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  })).data;
}
export async function updateEmployeePermissions(id: string, permissions: Record<string, boolean>) {
  return (await apiRequest<{ data: any }>(`/admin/employees/${encodeURIComponent(id)}/permissions`, { method: "PATCH", body: JSON.stringify({ permissions }) })).data;
}
export async function deleteEmployee(id: string) {
  return (await apiRequest<{ data: any }>(`/admin/employees/${encodeURIComponent(id)}`, { method: "DELETE" })).data;
}
