import { supabaseRequest } from "../utils/supabase.js";
import { DifyService } from "./dify.service.js";
import { ApiError } from "../utils/apiError.js";
import type { SessionContext } from "../types/index.js";

interface MessageRow {
  id: string;
  created_at: string;
}

export interface ChatMessageResult {
  reply: string;
  messageId: string;
  timestamp: string;
}

export interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface HistoryResult {
  conversationId: string;
  messages: HistoryMessage[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Chat Service
 * Coordinates message saving, AI answer generation, and history queries.
 */
export class ChatService {
  /**
   * Process and respond to user messages
   */
  static async sendMessage(session: SessionContext, messageRaw: unknown): Promise<ChatMessageResult> {
    const message = typeof messageRaw === "string" ? messageRaw.trim() : "";
    if (!message) {
      throw new ApiError(400, "MESSAGE_REQUIRED", "Please enter a message.");
    }
    if (message.length > 4000) {
      throw new ApiError(400, "MESSAGE_TOO_LONG", "Messages must be 4,000 characters or fewer.");
    }

    // 1. Save user message to Supabase
    await supabaseRequest<unknown>("messages", {
      method: "POST",
      body: [{ conversation_id: session.id, role: "user", content: message }],
      prefer: "return=minimal",
    });

    // 2. Fetch grounded reply from Dify RAG (using Gemini)
    const difyReply = await DifyService.getReply({
      message,
      clientId: session.client_id,
      difyConversationId: session.dify_conversation_id,
    });

    // 3. Save assistant reply to Supabase
    const assistantRows = await supabaseRequest<MessageRow[]>("messages?select=id,created_at", {
      method: "POST",
      body: [{ conversation_id: session.id, role: "assistant", content: difyReply.answer }],
      prefer: "return=representation",
    });

    const assistantMsg = assistantRows[0];
    if (!assistantMsg?.id || !assistantMsg.created_at) {
      throw new ApiError(503, "MESSAGE_SAVE_FAILED", "Failed to save AI assistant response.");
    }

    // 4. Update conversation timestamp & sync Dify conversation ID
    const conversationUpdate: Record<string, string> = { updated_at: new Date().toISOString() };
    if (difyReply.conversationId) {
      conversationUpdate.dify_conversation_id = difyReply.conversationId;
    }
    await supabaseRequest<undefined>(`conversations?id=eq.${session.id}`, {
      method: "PATCH",
      body: conversationUpdate,
      prefer: "return=minimal",
    });

    return {
      reply: difyReply.answer,
      messageId: assistantMsg.id,
      timestamp: assistantMsg.created_at,
    };
  }

  /**
   * Retrieve chronological chat history for an authenticated session
   */
  static async getHistory(
    session: SessionContext,
    limitRaw?: unknown,
    offsetRaw?: unknown
  ): Promise<HistoryResult> {
    const limit = Math.min(Math.max(Number.parseInt(String(limitRaw ?? "50"), 10) || 50, 1), 500);
    const offset = Math.max(Number.parseInt(String(offsetRaw ?? "0"), 10) || 0, 0);

    const rows = await supabaseRequest<HistoryMessage[]>(
      `messages?conversation_id=eq.${session.id}` +
        `&select=id,role,content,created_at&order=created_at.asc,id.asc&limit=${limit + 1}&offset=${offset}`
    );

    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit);

    return {
      conversationId: session.id,
      messages,
      pagination: {
        limit,
        offset,
        hasMore,
      },
    };
  }
}

