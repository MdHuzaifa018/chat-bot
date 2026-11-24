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
    const configs = await supabaseRequest<Array<ChatbotConfig & { websites?: { name: string; url?: string } }>>(
      `chatbot_configs?public_chatbot_id=eq.${encodeURIComponent(publicChatbotId)}&select=id,website_id,chatbot_name,system_prompt_override,is_published,allowed_origins&limit=1`
    );

    const config = configs[0];
    if (!config || !config.is_published) {
      throw new ApiError(404, "WIDGET_NOT_FOUND", "Chatbot widget is not active.");
    }
    this.assertOriginAllowed(config.allowed_origins || [], origin);

    const isLivePreview =
      conversationId === "dashboard-live-preview" ||
      conversationId === "live-preview" ||
      conversationId === "live" ||
      conversationId === "dashboard-preview" ||
      Boolean(conversationId && conversationId.includes("preview"));

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

    // 2. Comprehensive Knowledge Context Retrieval for Website
    let contextChunks: string[] = [];
    const sources: Array<{ title: string; url?: string }> = [];

    // 2A. Injected Master A-to-Z Training Knowledge if available
    if (config.system_prompt_override?.trim()) {
      contextChunks.push(`[Master A-to-Z Training Knowledge Base]\n${config.system_prompt_override.trim()}`);
      sources.push({ title: `${websiteName} Official Training Knowledge`, url: config.websites?.url });
    }

    try {
      // 2B. Full-text search via stored procedure match_website_knowledge
      const matches = await supabaseRequest<
        Array<{ id: string; title: string; content: string; source_url?: string }>
      >("rpc/match_website_knowledge", {
        method: "POST",
        body: {
          p_website_id: config.website_id,
          p_query: cleanMessage,
          p_limit: 5,
        },
      });

      if (matches && matches.length > 0) {
        matches.forEach((m) => {
          contextChunks.push(`[Document: ${m.title}]\n${m.content}`);
          if (m.title && !sources.some((s) => s.title === m.title)) {
            sources.push({ title: m.title, url: m.source_url });
          }
        });
      }
    } catch (err) {
      console.warn("[WidgetService] Stored procedure search error:", err);
    }

    // 2B. Guaranteed Multi-Lingual & General Knowledge Context:
    // Always append top website knowledge documents so Gemini understands the site from A-to-Z
    // regardless of language (Hindi, Hinglish, English) or query phrasing.
    try {
      const docs = await supabaseRequest<
        Array<{ id: string; title: string; content: string; source_url?: string }>
      >(
        `knowledge_documents?website_id=eq.${config.website_id}&select=id,title,content,source_url&order=created_at.desc&limit=8`
      );
      if (docs && docs.length > 0) {
        // Score docs by query keyword matching if available
        const cleanTokens = cleanMessage
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 2);

        const scored = docs.map((d) => {
          let score = 0;
          const textLower = `${d.title} ${d.content}`.toLowerCase();
          for (const token of cleanTokens) {
            if (textLower.includes(token)) score += 3;
          }
          return { d, score };
        });

        scored.sort((a, b) => b.score - a.score);

        for (const item of scored) {
          const docTitle = item.d.title || "Website Overview";
          if (!contextChunks.some((c) => c.includes(docTitle))) {
            contextChunks.push(`[Document: ${docTitle}]\n${item.d.content.slice(0, 3500)}`);
            if (!sources.some((s) => s.title === docTitle)) {
              sources.push({ title: docTitle, url: item.d.source_url });
            }
          }
          if (contextChunks.length >= 6) break;
        }
      }
    } catch (err) {
      console.warn("[WidgetService] Knowledge documents fallback error:", err);
    }

    // 2C. Fallback to raw crawled_pages if knowledge_documents was empty
    if (contextChunks.length === 0) {
      try {
        const pages = await supabaseRequest<
          Array<{ id: string; title: string; clean_text: string; url: string }>
        >(
          `crawled_pages?website_id=eq.${config.website_id}&select=id,title,clean_text,url&limit=6`
        );
        if (pages && pages.length > 0) {
          pages.forEach((p) => {
            contextChunks.push(`[Page: ${p.title || p.url}]\n${p.clean_text.slice(0, 3500)}`);
            if (p.title && !sources.some((s) => s.title === p.title)) {
              sources.push({ title: p.title, url: p.url });
            }
          });
        }
      } catch (err) {
        console.warn("[WidgetService] Crawled pages fallback error:", err);
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

  /**
   * Submit fallback contact inquiry directly to the website owner / support team
   */
  static async submitContactInquiry({
    publicChatbotId,
    name,
    email,
    subject,
    message,
    origin,
  }: {
    publicChatbotId: string;
    name: string;
    email: string;
    subject?: string;
    message: string;
    origin?: string;
  }) {
    if (!name || !email || !message) {
      throw new ApiError(400, "MISSING_CONTACT_FIELDS", "Name, email, and message are required.");
    }

    const configs = await supabaseRequest<ChatbotConfig[]>(
      `chatbot_configs?public_chatbot_id=eq.${publicChatbotId}&select=id,website_id,chatbot_name,allowed_origins,is_published&limit=1`
    );
    const config = configs[0];
    if (!config || !config.is_published) {
      throw new ApiError(404, "WIDGET_NOT_FOUND", "Chatbot widget not found.");
    }
    this.assertOriginAllowed(config.allowed_origins || [], origin);

    let siteName = config.chatbot_name;
    try {
      const sites = await supabaseRequest<any[]>(
        `websites?id=eq.${encodeURIComponent(config.website_id)}&select=id,name,url&limit=1`
      );
      if (sites[0]?.name) siteName = sites[0].name;
    } catch {}

    // Persist as inquiry in Supabase conversation & message log
    try {
      const tokenHash = hashToken(generateSessionToken());
      const convoRows = await supabaseRequest<WidgetConversation[]>("widget_conversations", {
        method: "POST",
        prefer: "return=representation",
        body: {
          website_id: config.website_id,
          public_chatbot_id: publicChatbotId,
          visitor_id: `contact_${Date.now()}`,
          session_token_hash: tokenHash,
          status: "closed",
        },
      });
      const convoId = convoRows[0]?.id;
      if (convoId) {
        await supabaseRequest("widget_messages", {
          method: "POST",
          body: {
            conversation_id: convoId,
            role: "user",
            content: `[CONTACT INQUIRY from ${name} <${email}>${subject ? ` | Subject: ${subject}` : ""}]\n\n${message}`,
          },
        });
      }
    } catch (saveErr) {
      console.warn("[WidgetService] Failed to persist inquiry:", saveErr);
    }

    console.log(
      `[WidgetService] 📧 Fallback Contact Inquiry for "${siteName}": From ${name} <${email}> (${subject || "General Inquiry"})`
    );

    return {
      success: true,
      message: "Thank you! Your message has been sent to our team. We'll get back to you shortly.",
      recipientBot: siteName,
    };
  }
}
