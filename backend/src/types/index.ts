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
  dify_conversation_id: string | null;
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
  dify_conversation_id: string | null;
}

export interface DifyReply {
  answer: string;
  conversationId: string | null;
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

