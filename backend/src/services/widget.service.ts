import { supabaseRequest } from "../utils/supabase.js";
import { ApiError } from "../utils/apiError.js";
import { GeminiService } from "./gemini.service.js";
import { hashToken, generateSessionToken } from "../utils/crypto.js";
import { env } from "../config/env.js";
import type {
  ChatbotConfig,
  SuggestedQuestion,
  WidgetConversation,
  WidgetMessage,
} from "../types/index.js";

export class WidgetService {
  private static assertOriginAllowed(allowedOrigins: string[], origin?: string): void {
    if (!origin) return;
    if (allowedOrigins && (allowedOrigins.includes("*") || allowedOrigins.length === 0)) return;
    if (origin === env.security.allowedOrigin || origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000") return;
    if (allowedOrigins && allowedOrigins.includes(origin)) return;
    try {
      const originHost = new URL(origin).hostname;
      if (allowedOrigins && allowedOrigins.some((ao) => ao.includes(originHost) || originHost.includes(ao.replace(/^https?:\/\//, "")))) {
        return;
      }
    } catch {
      // ignore
    }
    throw new ApiError(403, "WIDGET_ORIGIN_NOT_ALLOWED", "This website is not allowed to use this chatbot.");
  }

  /**
   * Fetch public config and suggested questions for widget display
   */
  static async getPublicConfig(publicChatbotId: string, origin?: string) {
    const configs = await supabaseRequest<ChatbotConfig[]>(
      `chatbot_configs?public_chatbot_id=eq.${publicChatbotId}&select=id,website_id,public_chatbot_id,chatbot_name,welcome_message,placeholder_text,primary_color,secondary_color,background_color,text_color,font_family,logo_url,position,allowed_origins,is_published&limit=1`
    );

    const config = configs[0];
    if (!config || !config.is_published) {
      throw new ApiError(404, "WIDGET_NOT_FOUND", "Chatbot widget is inactive or not found.");
    }
    this.assertOriginAllowed(config.allowed_origins || [], origin);

    const questions = await supabaseRequest<SuggestedQuestion[]>(
      `suggested_questions?website_id=eq.${config.website_id}&is_active=eq.true&order=display_order.asc&limit=5`
    );

    return {
      config,
      suggestedQuestions: questions.map((q) => q.question_text),
    };
  }

  /**
   * Start or resume visitor session
   */
  static async startVisitorSession(publicChatbotId: string, visitorId?: string, origin?: string) {
    const configs = await supabaseRequest<ChatbotConfig[]>(
      `chatbot_configs?public_chatbot_id=eq.${publicChatbotId}&select=id,website_id,is_published,allowed_origins&limit=1`
    );

    const config = configs[0];
    if (!config || !config.is_published) {
      throw new ApiError(404, "WIDGET_NOT_FOUND", "Chatbot widget not found.");
    }
    this.assertOriginAllowed(config.allowed_origins || [], origin);

    const effectiveVisitorId = visitorId?.trim() || `vis_${generateSessionToken().substring(0, 16)}`;
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);

    const convoRows = await supabaseRequest<WidgetConversation[]>("widget_conversations", {
      method: "POST",
      prefer: "return=representation",
      body: {
        website_id: config.website_id,
        public_chatbot_id: publicChatbotId,
        visitor_id: effectiveVisitorId,
        session_token_hash: tokenHash,
        status: "active",
      },
    });
    const conversationId = convoRows[0]?.id;
    if (!conversationId) throw new ApiError(503, "WIDGET_SESSION_CREATE_FAILED", "Could not start a chat session.");

    // Record widget open event
    try {
      await supabaseRequest("analytics_events", {
        method: "POST",
        body: {
          website_id: config.website_id,
          event_type: "widget_session_start",
          metadata: { visitor_id: effectiveVisitorId },
        },
      });
    } catch {
      // ignore
    }

    return {
      conversationId,
      visitorId: effectiveVisitorId,
      sessionToken,
    };
  }

  /**
   * Process a visitor message through Gemini with website-specific grounded context
   */
  static async handleVisitorMessage({
    publicChatbotId,
    message,
    conversationId,
    sessionToken,
    origin,
  }: {
    publicChatbotId: string;
    message: string;
    conversationId?: string;
    sessionToken?: string;
    origin?: string;
  }) {
    const cleanMessage = message?.trim();
    if (!cleanMessage) {
      throw new ApiError(400, "EMPTY_MESSAGE", "Message cannot be empty.");
    }

    if (cleanMessage.length > 400) {
      throw new ApiError(400, "MESSAGE_TOO_LONG", "Message cannot exceed 400 characters.");
    }

    // 1. Fetch Chatbot Config & Website Info
    const configs = await supabaseRequest<Array<ChatbotConfig & { websites?: { name: string } }>>(
      `chatbot_configs?public_chatbot_id=eq.${encodeURIComponent(publicChatbotId)}&select=id,website_id,chatbot_name,system_prompt_override,is_published,allowed_origins&limit=1`
    );

    const config = configs[0];
    if (!config || !config.is_published) {
      throw new ApiError(404, "WIDGET_NOT_FOUND", "Chatbot widget is not active.");
    }
    this.assertOriginAllowed(config.allowed_origins || [], origin);

    const isLivePreview = conversationId === "dashboard-live-preview" || conversationId === "live-preview" || conversationId === "live";

    if (!isLivePreview) {
      if (!conversationId || !sessionToken) {
        throw new ApiError(401, "WIDGET_SESSION_REQUIRED", "Start a widget session before sending messages.");
      }
      const sessions = await supabaseRequest<Array<{ id: string }>>(
        `widget_conversations?id=eq.${encodeURIComponent(conversationId)}&public_chatbot_id=eq.${encodeURIComponent(publicChatbotId)}&session_token_hash=eq.${hashToken(sessionToken)}&status=eq.active&limit=1`
      );
      if (!sessions[0]) throw new ApiError(401, "WIDGET_SESSION_INVALID", "Widget session is invalid or expired.");
    }

    const websiteName = config.chatbot_name || "Website Support";

    // 1. Check for instant exact FAQ match in knowledge_documents
    try {
      const faqs = await supabaseRequest<Array<{ title: string; content: string }>>(
        `knowledge_documents?website_id=eq.${encodeURIComponent(config.website_id)}&source_type=eq.faq&select=title,content&limit=30`
      );
      const matchedFaq = faqs?.find((f) => f.title.trim().toLowerCase() === cleanMessage.toLowerCase());
      if (matchedFaq?.content) {
        if (conversationId && !isLivePreview) {
          await supabaseRequest("widget_messages", {
            method: "POST",
            body: [
              { conversation_id: conversationId, role: "user", content: cleanMessage, sources: [] },
              { conversation_id: conversationId, role: "assistant", content: matchedFaq.content, sources: [] },
            ],
          }).catch((err) => console.warn("[WidgetService] Failed to persist fixed message history:", err));
        }
        return { answer: matchedFaq.content, sources: [], model: "fixed-faq", timestamp: new Date().toISOString() };
      }
    } catch {
      // Continue to full knowledge retrieval
    }

    // 2. Retrieve Knowledge Context for Website
    let contextChunks: string[] = [];
    const sources: Array<{ title: string; url?: string }> = [];

    try {
      // 2A. First try stored procedure match_website_knowledge
      const matches = await supabaseRequest<
        Array<{ id: string; title: string; content: string; source_url?: string }>
      >("rpc/match_website_knowledge", {
        method: "POST",
        body: {
          p_website_id: config.website_id,
          p_query: cleanMessage,
          p_limit: 4,
        },
      });

      if (matches && matches.length > 0) {
        contextChunks = matches.map((m) => `[Document: ${m.title}]\n${m.content}`);
        matches.forEach((m) => {
          if (m.title && !sources.some((s) => s.title === m.title)) {
            sources.push({ title: m.title, url: m.source_url });
          }
        });
      }
    } catch (err) {
      console.warn("[WidgetService] Stored procedure search error:", err);
    }

    // 2B. Guaranteed Fallback: If full-text search returned 0 matches (e.g. Hindi, Hinglish, or conceptual queries),
    // fetch the website's crawled knowledge documents directly so the AI ALWAYS knows the website's content!
    if (contextChunks.length === 0) {
      try {
        const docs = await supabaseRequest<
          Array<{ id: string; title: string; content: string; source_url?: string }>
        >(
          `knowledge_documents?website_id=eq.${config.website_id}&select=id,title,content,source_url&order=created_at.desc&limit=5`
        );
        if (docs && docs.length > 0) {
          contextChunks = docs.map((d) => `[Document: ${d.title}]\n${d.content.substring(0, 1500)}`);
          docs.forEach((d) => {
            if (d.title && !sources.some((s) => s.title === d.title)) {
              sources.push({ title: d.title, url: d.source_url });
            }
          });
        }
      } catch (err) {
        console.warn("[WidgetService] Fallback docs error:", err);
      }
    }

    // 2C. Additional Fallback: Crawled pages clean text
    if (contextChunks.length === 0) {
      try {
        const pages = await supabaseRequest<
          Array<{ id: string; title: string; clean_text: string; url: string }>
        >(
          `crawled_pages?website_id=eq.${config.website_id}&select=id,title,clean_text,url&limit=4`
        );
        if (pages && pages.length > 0) {
          contextChunks = pages.map((p) => `[Page: ${p.title}]\n${p.clean_text.substring(0, 1500)}`);
          pages.forEach((p) => {
            if (p.title && !sources.some((s) => s.title === p.title)) {
              sources.push({ title: p.title, url: p.url });
            }
          });
        }
      } catch (err) {
        console.warn("[WidgetService] Fallback pages error:", err);
      }
    }

    // 3. Fast Gemini Grounded Reply Generation
    const geminiResult = await GeminiService.generateWebsiteReply({
      websiteName,
      userMessage: cleanMessage,
      contextChunks,
      customSystemPrompt: config.system_prompt_override,
    });

    // 4. Save message history for persistent visitor conversations (skip preview)
    if (conversationId && !isLivePreview) {
      await supabaseRequest<WidgetMessage[]>("widget_messages", {
        method: "POST",
        body: [
          {
            conversation_id: conversationId,
            role: "user",
            content: cleanMessage,
            sources: [],
          },
          {
            conversation_id: conversationId,
            role: "assistant",
            content: geminiResult.answer,
            sources,
          },
        ],
      }).catch((err) => console.warn("[WidgetService] Failed to persist message history:", err));
    }

    // 5. Track analytics asynchronously in background (NON-BLOCKING)
    supabaseRequest("analytics_events", {
      method: "POST",
      body: {
        website_id: config.website_id,
        event_type: "widget_message_sent",
        metadata: { query_length: cleanMessage.length, model: geminiResult.model },
      },
    }).catch(() => {});

    return {
      answer: geminiResult.answer,
      sources,
      model: geminiResult.model,
      timestamp: new Date().toISOString(),
    };
  }
}
