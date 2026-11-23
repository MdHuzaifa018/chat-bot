import { supabaseRequest } from "../utils/supabase.js";
import { ApiError } from "../utils/apiError.js";
import { CrawlerService } from "./crawler.service.js";
import { ThemeDetectorService, type DetectedTheme } from "./themeDetector.service.js";
import { GeminiService } from "./gemini.service.js";
import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import type {
  Website,
  ChatbotConfig,
  SuggestedQuestion,
  KnowledgeDocument,
  CrawledPage,
} from "../types/index.js";

export class WebsiteService {
  /**
   * Create a new website, run crawler and auto-detect theme & suggested questions
   */
  static async createWebsite({
    userId,
    clientAccountId,
    name,
    url,
  }: {
    userId: string;
    clientAccountId: string;
    name?: string;
    url: string;
  }): Promise<{
    website: Website;
    chatbotConfig: ChatbotConfig;
    detectedTheme: DetectedTheme;
    pagesCrawled: number;
    suggestedQuestions: string[];
  }> {
    const safeUrl = CrawlerService.validateSafeUrl(url);
    const domain = safeUrl.hostname;
    const initialName = name?.trim() || domain;

    // 1. Fetch homepage HTML for quick theme extraction
    let homepageHtml = "";
    try {
      homepageHtml = await CrawlerService.fetchHtml(safeUrl.href, 6000);
    } catch {
      // Continue even if initial fetch is delayed
    }

    const detectedTheme: DetectedTheme = homepageHtml
      ? ThemeDetectorService.extractTheme(homepageHtml, safeUrl)
      : {
          primaryColor: "#254B35",
          secondaryColor: "#3B82F6",
          accentColor: "#A8C99B",
          backgroundColor: "#FFFFFF",
          cardBackgroundColor: "#F8FAFC",
          textColor: "#1E293B",
          borderColor: "#E2E8F0",
          buttonColor: "#254B35",
          buttonTextColor: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          fontHeading: "Inter, system-ui, sans-serif",
          logoUrl: `${safeUrl.origin}/favicon.ico`,
          brandName: initialName,
          confidence: { primaryColor: 0.5, fontFamily: 0.5, logoUrl: 0.5, brandName: 0.5 },
          sources: { primaryColor: "Default", fontFamily: "Default", logoUrl: "Default", brandName: "Default" },
        };

    const finalName = name?.trim() || detectedTheme.brandName || domain;

    // 2. Insert Website Record
    const websiteRows = await supabaseRequest<Website[]>("websites", {
      method: "POST",
      prefer: "return=representation",
      body: {
        user_id: userId,
        name: finalName,
        url: safeUrl.href,
        domain,
        crawl_status: "in_progress",
      },
    });

    const website = websiteRows[0];
    if (!website) {
      throw new ApiError(500, "CREATE_FAILED", "Failed to create website profile.");
    }

    // 3. Create Default Chatbot Config
    const publicChatbotId = `bot_${randomBytes(12).toString("hex")}`;
    const configRows = await supabaseRequest<ChatbotConfig[]>("chatbot_configs", {
      method: "POST",
      prefer: "return=representation",
      body: {
        website_id: website.id,
        public_chatbot_id: publicChatbotId,
        chatbot_name: `${finalName} Assistant`,
        welcome_message: `Hi there! 👋 Welcome to ${finalName}. How can I help you today?`,
        placeholder_text: "Ask anything about our services...",
        primary_color: detectedTheme.primaryColor,
        secondary_color: detectedTheme.secondaryColor,
        accent_color: detectedTheme.accentColor || "#A8C99B",
        background_color: detectedTheme.backgroundColor || "#FFFFFF",
        text_color: detectedTheme.textColor || "#1E293B",
        border_color: detectedTheme.borderColor || "#E2E8F0",
        button_color: detectedTheme.buttonColor || detectedTheme.primaryColor,
        button_text_color: detectedTheme.buttonTextColor || "#FFFFFF",
        font_family: detectedTheme.fontFamily,
        font_heading: detectedTheme.fontHeading || detectedTheme.fontFamily,
        logo_url: detectedTheme.logoUrl,
        theme_confidence: detectedTheme.confidence,
        position: "bottom-right",
        allowed_origins: Array.from(new Set([safeUrl.origin, env.security.allowedOrigin, "http://localhost:5000", "http://localhost:3000"])),
        is_published: true,
      },
    });

    const chatbotConfig = configRows[0];
    if (!chatbotConfig) {
      await supabaseRequest<undefined>(`websites?id=eq.${encodeURIComponent(website.id)}`, { method: "DELETE", prefer: "return=minimal" });
      throw new ApiError(503, "CHATBOT_CONFIG_CREATE_FAILED", "Could not create chatbot configuration for this website.");
    }

    // 4. Crawl pages (homepage + sitemap + internal links)
    let crawledPages: Array<{ title: string; cleanText: string; url: string }> = [];
    let crawlStatus: Website["crawl_status"] = "failed";
    try {
      crawledPages = await CrawlerService.crawlWebsite(website.id, safeUrl.href, 8);
      crawlStatus = crawledPages.length > 0 ? "completed" : "failed";
      await supabaseRequest(`websites?id=eq.${website.id}`, {
        method: "PATCH",
        body: {
          crawl_status: crawlStatus,
          last_crawled_at: new Date().toISOString(),
        },
      });
    } catch (crawlErr) {
      console.warn("[WebsiteService] Crawling error:", crawlErr);
      await supabaseRequest(`websites?id=eq.${website.id}`, {
        method: "PATCH",
        body: {
          crawl_status: "failed",
          last_crawled_at: new Date().toISOString(),
        },
      });
    }

    // 5. Generate Smart Suggested Questions with Gemini
    const summaries = crawledPages.map((p) => `${p.title}: ${p.cleanText.substring(0, 300)}`);
    const questions = await GeminiService.generateSuggestedQuestions(finalName, summaries);

    for (let i = 0; i < questions.length; i++) {
      try {
        await supabaseRequest("suggested_questions", {
          method: "POST",
          body: {
            website_id: website.id,
            question_text: questions[i],
            display_order: i,
            is_active: true,
          },
        });
      } catch {
        // ignore duplicate
      }
    }

    return {
      website: {
        ...website,
        crawl_status: crawlStatus,
      },
      chatbotConfig,
      detectedTheme,
      pagesCrawled: crawledPages.length,
      suggestedQuestions: questions,
    };
  }

  /**
   * List websites for user
   */
  static async listWebsites(userId?: string): Promise<Website[]> {
    const filter = userId ? `user_id=eq.${encodeURIComponent(userId)}&` : "";
    const rows = await supabaseRequest<Website[]>(
      `websites?${filter}select=id,user_id,name,url,domain,description,crawl_status,last_crawled_at,created_at,updated_at&order=created_at.desc&limit=50`
    );
    return rows || [];
  }

  /**
   * Get single website details with config and questions
   */
  static async getWebsiteDetails(websiteId: string, _userId?: string) {
    const websites = await supabaseRequest<Website[]>(`websites?id=eq.${encodeURIComponent(websiteId)}&limit=1`);
    const website = websites[0];
    if (!website) {
      throw new ApiError(404, "NOT_FOUND", "Website not found.");
    }

    const configs = await supabaseRequest<ChatbotConfig[]>(`chatbot_configs?website_id=eq.${websiteId}&limit=1`);
    const questions = await supabaseRequest<SuggestedQuestion[]>(
      `suggested_questions?website_id=eq.${websiteId}&order=display_order.asc`
    );
    const pages = await supabaseRequest<CrawledPage[]>(
      `crawled_pages?website_id=eq.${websiteId}&select=id,url,path,title,description,created_at&order=created_at.desc&limit=20`
    );
    const docs = await supabaseRequest<KnowledgeDocument[]>(
      `knowledge_documents?website_id=eq.${websiteId}&select=id,title,source_type,source_url,content,created_at&order=created_at.desc&limit=30`
    );

    return {
      website,
      chatbotConfig: configs[0] || null,
      suggestedQuestions: questions || [],
      crawledPages: pages || [],
      knowledgeDocuments: docs || [],
    };
  }

  /**
   * Update chatbot customization
   */
  static async updateChatbotConfig(
    websiteId: string,
    clientAccountId: string,
    updates: Partial<ChatbotConfig>
  ): Promise<ChatbotConfig> {
    await this.getOwnedWebsite(websiteId, clientAccountId);
    const allowed = [
      "chatbot_name",
      "welcome_message",
      "placeholder_text",
      "primary_color",
      "secondary_color",
      "background_color",
      "text_color",
      "font_family",
      "logo_url",
      "position",
      "allowed_origins",
      "is_published",
      "system_prompt_override",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const key of allowed) {
      if ((updates as Record<string, unknown>)[key] !== undefined) {
        sanitized[key] = (updates as Record<string, unknown>)[key];
      }
    }

    const rows = await supabaseRequest<ChatbotConfig[]>(`chatbot_configs?website_id=eq.${encodeURIComponent(websiteId)}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: sanitized,
    });

    if (!rows || rows.length === 0) {
      throw new ApiError(404, "CONFIG_NOT_FOUND", "Chatbot configuration not found.");
    }

    return rows[0];
  }

  static async updateSuggestedQuestions(
    websiteId: string,
    clientAccountId: string,
    questions: Array<{ question_text: string; answer?: string }>
  ): Promise<SuggestedQuestion[]> {
    await this.getOwnedWebsite(websiteId, clientAccountId);
    if (!Array.isArray(questions) || questions.length > 30) {
      throw new ApiError(400, "INVALID_QUESTIONS", "Provide up to 30 questions.");
    }
    const sanitized = questions.map((item, index) => ({
      website_id: websiteId,
      question_text: String(item.question_text ?? "").trim().slice(0, 200),
      answer: String(item.answer ?? "").trim().slice(0, 2000) || null,
      display_order: index,
      is_active: true,
    })).filter((item) => item.question_text.length > 0);

    await supabaseRequest<undefined>(`suggested_questions?website_id=eq.${encodeURIComponent(websiteId)}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
    if (sanitized.length === 0) return [];
    return supabaseRequest<SuggestedQuestion[]>("suggested_questions", {
      method: "POST",
      prefer: "return=representation",
      body: sanitized,
    });
  }

  /**
   * Add a manual knowledge document or FAQ
   */
  static async addKnowledgeDoc(
    websiteId: string,
    clientAccountId: string,
    { title, content, sourceType }: { title: string; content: string; sourceType?: "manual_doc" | "faq" }
  ): Promise<KnowledgeDocument> {
    await this.getOwnedWebsite(websiteId, clientAccountId);
    if (!title?.trim() || !content?.trim()) {
      throw new ApiError(400, "INVALID_INPUT", "Title and content are required.");
    }

    const rows = await supabaseRequest<KnowledgeDocument[]>("knowledge_documents", {
      method: "POST",
      prefer: "return=representation",
      body: {
        website_id: websiteId,
        title: title.trim(),
        content: content.trim(),
        source_type: sourceType || "manual_doc",
      },
    });

    return rows[0];
  }

  /**
   * Re-crawl website
   */
  static async recrawlWebsite(websiteId: string, clientAccountId?: string): Promise<number> {
    const website = await this.getOwnedWebsite(websiteId, clientAccountId);

    await supabaseRequest(`websites?id=eq.${websiteId}`, {
      method: "PATCH",
      body: { crawl_status: "in_progress" },
    });

    const pages = await CrawlerService.crawlWebsite(websiteId, website.url, 8);

    await supabaseRequest(`websites?id=eq.${websiteId}`, {
      method: "PATCH",
      body: {
        crawl_status: "completed",
        last_crawled_at: new Date().toISOString(),
      },
    });

    return pages.length;
  }

  private static async getOwnedWebsite(websiteId: string, _clientAccountId?: string): Promise<Website> {
    const rows = await supabaseRequest<Website[]>(
      `websites?id=eq.${encodeURIComponent(websiteId)}&limit=1`
    );
    if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "Website not found.");
    return rows[0];
  }
}
