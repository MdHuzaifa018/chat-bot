import { supabaseRequest } from "../utils/supabase.js";
import { AiOrchestratorService } from "./aiOrchestrator.service.js";
import { QuotaService } from "./quota.service.js";
import { FaqService } from "./faq.service.js";
import { validateAndGuardMessage } from "../utils/guardrails.js";
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
  provider?: string;
  cached?: boolean;
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
 * Coordinates input validation, student daily quota, FAQ caching,
 * multi-provider AI failover, and message persistence.
 */
export class ChatService {
  /**
   * Process and respond to user messages with complete guardrails
   */
  static async sendMessage(session: SessionContext, messageRaw: unknown): Promise<ChatMessageResult> {
    // 1. Phase 9 & 10: Strict 400-char validation, XSS sanitization & prompt injection guard
    const guardResult = validateAndGuardMessage(messageRaw);
    const sanitizedMessage = guardResult.sanitizedMessage;

    // Handle direct guardrail rejections (e.g., prompt injection or academic assignments)
    if (!guardResult.isValid && guardResult.directAnswer) {
      // Save user attempt and official policy response for audit trail
      await supabaseRequest<unknown>("messages", {
        method: "POST",
        body: [{ conversation_id: session.id, role: "user", content: sanitizedMessage }],
        prefer: "return=minimal",
      });

      const assistantRows = await supabaseRequest<MessageRow[]>("messages?select=id,created_at", {
        method: "POST",
        body: [{ conversation_id: session.id, role: "assistant", content: guardResult.directAnswer }],
        prefer: "return=representation",
      });

      const assistantMsg = assistantRows[0];
      return {
        reply: guardResult.directAnswer,
        messageId: assistantMsg?.id || `guard-${Date.now()}`,
        timestamp: assistantMsg?.created_at || new Date().toISOString(),
        provider: "guardrail_policy",
        cached: false,
      };
    }

    // 2. Phase 4: Enforce Student Daily Usage Quota (Atomic Database RPC)
    await QuotaService.consumeDailyMessageQuota(session.client_id);

    // 3. Phase 5: Check Verified FAQ Cache before invoking LLM (Saves tokens & returns instant answers)
    const faqResult = await FaqService.checkFaqCache(sanitizedMessage);
    if (faqResult.hit && faqResult.answer) {
      await supabaseRequest<unknown>("messages", {
        method: "POST",
        body: [{ conversation_id: session.id, role: "user", content: sanitizedMessage }],
        prefer: "return=minimal",
      });

      const assistantRows = await supabaseRequest<MessageRow[]>("messages?select=id,created_at", {
        method: "POST",
        body: [{ conversation_id: session.id, role: "assistant", content: faqResult.answer }],
        prefer: "return=representation",
      });

      const assistantMsg = assistantRows[0];
      return {
        reply: faqResult.answer,
        messageId: assistantMsg?.id || `faq-${Date.now()}`,
        timestamp: assistantMsg?.created_at || new Date().toISOString(),
        provider: "faq_cache",
        cached: true,
      };
    }

    // 4. Save user message to Supabase
    await supabaseRequest<unknown>("messages", {
      method: "POST",
      body: [{ conversation_id: session.id, role: "user", content: sanitizedMessage }],
      prefer: "return=minimal",
    });

    // 5. Phase 6 & 7: Fetch answer via Multi-Provider AI Failover (Dify -> Groq -> OpenRouter -> Fallback)
    const aiResponse = await AiOrchestratorService.generateReply({
      message: sanitizedMessage,
      clientId: session.client_id,
      difyConversationId: session.dify_conversation_id,
    });

    // 6. Save AI assistant reply to Supabase
    const assistantRows = await supabaseRequest<MessageRow[]>("messages?select=id,created_at", {
      method: "POST",
      body: [{ conversation_id: session.id, role: "assistant", content: aiResponse.answer }],
      prefer: "return=representation",
    });

    const assistantMsg = assistantRows[0];
    if (!assistantMsg?.id || !assistantMsg.created_at) {
      throw new ApiError(503, "MESSAGE_SAVE_FAILED", "Failed to save AI assistant response.");
    }

    // 7. Update conversation timestamp & sync Dify conversation ID if applicable
    const conversationUpdate: Record<string, string> = { updated_at: new Date().toISOString() };
    if (aiResponse.conversationId) {
      conversationUpdate.dify_conversation_id = aiResponse.conversationId;
    }
    await supabaseRequest<undefined>(`conversations?id=eq.${session.id}`, {
      method: "PATCH",
      body: conversationUpdate,
      prefer: "return=minimal",
    });

    return {
      reply: aiResponse.answer,
      messageId: assistantMsg.id,
      timestamp: assistantMsg.created_at,
      provider: aiResponse.provider,
      cached: false,
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
