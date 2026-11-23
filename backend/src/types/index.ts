import type { Request } from "express";

export interface Client {
  id: string;
  email: string;
  consent_status: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  status: "active" | "closed";
  session_token_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SessionContext {
  id: string;
  client_id: string;
  status: "active" | "closed";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

// Extend Express Request to include authenticated session
export interface AuthenticatedRequest extends Request {
  sessionContext?: SessionContext;
  sessionTokenHash?: string;
}

// Multi-Tenant SaaS Interfaces
export interface SaaSUser {
  id: string;
  email: string;
  name?: string | null;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface Website {
  id: string;
  user_id: string;
  client_account_id?: string | null;
  name: string;
  url: string;
  domain: string;
  description?: string | null;
  crawl_status: "idle" | "in_progress" | "completed" | "failed";
  last_crawled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawledPage {
  id: string;
  website_id: string;
  url: string;
  path: string;
  title?: string | null;
  description?: string | null;
  clean_text: string;
  page_type?: string;
  content_hash?: string;
  status: "crawled" | "indexed" | "failed";
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  website_id: string;
  title: string;
  slug?: string;
  chunk_index?: number;
  source_type: "crawled_chunk" | "crawled_page" | "manual_doc" | "faq";
  source_url?: string | null;
  source_heading?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ChatbotConfig {
  id: string;
  website_id: string;
  public_chatbot_id: string;
  chatbot_name: string;
  welcome_message: string;
  placeholder_text: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  background_color: string;
  text_color: string;
  border_color?: string;
  button_color?: string;
  button_text_color?: string;
  font_family: string;
  font_heading?: string;
  logo_url?: string | null;
  theme_confidence?: Record<string, number>;
  position: "bottom-right" | "bottom-left";
  allowed_origins: string[];
  is_published: boolean;
  system_prompt_override?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestedQuestion {
  id: string;
  website_id: string;
  question_text: string;
  answer?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface WidgetConversation {
  id: string;
  website_id: string;
  public_chatbot_id: string;
  visitor_id: string;
  session_token_hash: string;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
}

export interface WidgetMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Array<{ title: string; url?: string }>;
  created_at: string;
}
