import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

export interface GroundedReplyResult {
  answer: string;
  provider: "gemini_api" | "grounded_fallback";
  model: string;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

/**
 * Gemini Service
 * Direct integration with Google Gemini API via official @google/genai SDK
 * with automatic model failover between fast models (gemini-3.5-flash-lite, gemini-3.8-flash).
 * Supports multi-tenant website grounded Q&A and automated question generation.
 */
export class GeminiService {
  private static client: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI {
    if (!this.client) {
      if (!env.gemini.isConfigured) {
        throw new ApiError(503, "AI_UNAVAILABLE", "Gemini API key is not configured.");
      }
      this.client = new GoogleGenAI({ apiKey: env.gemini.apiKey });
    }
    return this.client;
  }

  /**
   * Multi-Tenant Website Grounded Q&A
   */
  static async generateWebsiteReply({
    websiteName,
    userMessage,
    contextChunks,
    customSystemPrompt,
    conversationHistory = [],
  }: {
    websiteName: string;
    userMessage: string;
    contextChunks: string[];
    customSystemPrompt?: string | null;
    conversationHistory?: ChatHistoryItem[];
  }): Promise<GroundedReplyResult> {
    const isHindiOrHinglish = /[\u0900-\u097F]|kya|kaise|karo|batao|chahiye|kitna|hai|hain|nahi|kaha|kaun/i.test(userMessage);

    // Helper for smart extractive answer from crawled website content & master training prompt
    const generateExtractiveAnswer = (): string => {
      const allKnowledge = [customSystemPrompt || "", ...contextChunks].join("\n\n");
      if (!allKnowledge.trim()) {
        return isHindiOrHinglish
          ? `Main ${websiteName} ka official AI Assistant hoon. Main aapki is website ke bare me help karne ke liye taiyar hoon. Aap mujhse services, pricing ya contact ke bare me puch sakte hain.`
          : `I am the official AI Support Assistant for ${websiteName}. How can I assist you with our services, pricing, or support today?`;
      }

      const cleanQ = userMessage.toLowerCase().trim();

      // 1. Check for Contact / Phone / Email query
      if (/phone|mobile|call|number|email|contact|address|location|office|hours|timing|sampark/i.test(cleanQ)) {
        const contactSectionMatch = allKnowledge.match(/(?:7\.\s*CONTACT[^\n]*|\bCONTACT & SUPPORT[^\n]*)([\s\S]*?)(?=(?:\d+\.|\b===|\bDIRECTIVES))/i);
        if (contactSectionMatch && contactSectionMatch[1].trim()) {
          const details = contactSectionMatch[1].trim().replace(/\n+/g, " | ");
          return isHindiOrHinglish
            ? `Aap ${websiteName} support team se yahan sampark kar sakte hain: ${details}. Hamari team aapki help karne ke liye taiyar hai!`
            : `You can reach out to ${websiteName} support directly: ${details}. Let us know if you need any further assistance!`;
        }
      }

      // 2. Check for Pricing / Plans query
      if (/price|pricing|cost|charge|fees|rate|plan|package|kitna|rupee|dollar|subscription|refund/i.test(cleanQ)) {
        const pricingSectionMatch = allKnowledge.match(/(?:6\.\s*PRICING[^\n]*|\bPRICING, PLANS[^\n]*)([\s\S]*?)(?=(?:\d+\.|\b===|\bDIRECTIVES))/i);
        if (pricingSectionMatch && pricingSectionMatch[1].trim()) {
          const details = pricingSectionMatch[1].trim().replace(/\n+/g, " ");
          return isHindiOrHinglish
            ? `${websiteName} ke pricing aur plans ke mutabik: ${details}. Kya aap kisi specific plan ke bare me janna chahte hain?`
            : `Regarding ${websiteName} pricing and plans: ${details}. Please let us know if you would like a custom quote!`;
        }
      }

      // 3. Check for Services / Products query
      if (/service|product|feature|solution|offer|kya karte|kaam|features/i.test(cleanQ)) {
        const serviceSectionMatch = allKnowledge.match(/(?:5\.\s*CORE SERVICES[^\n]*|\bPRODUCTS & SERVICES[^\n]*)([\s\S]*?)(?=(?:\d+\.|\b===|\bDIRECTIVES))/i);
        if (serviceSectionMatch && serviceSectionMatch[1].trim()) {
          const details = serviceSectionMatch[1].trim().replace(/\n+/g, " ");
          return isHindiOrHinglish
            ? `${websiteName} yeh pramukh services aur solutions provide karta hai: ${details}.`
            : `${websiteName} provides the following key services and solutions: ${details}.`;
        }
      }

      // 4. Check for About / Overview / Intro query
      if (/about|who are you|kya hai|intro|company|bare me|website kya|platform|tell me/i.test(cleanQ)) {
        const aboutSectionMatch = allKnowledge.match(/(?:4\.\s*ABOUT US[^\n]*|\bABOUT & MISSION[^\n]*)([\s\S]*?)(?=(?:\d+\.|\b===|\bDIRECTIVES))/i);
        if (aboutSectionMatch && aboutSectionMatch[1].trim()) {
          const details = aboutSectionMatch[1]
            .replace(/\b(Home|Solutions|Team|Students|Fellowship|Community|Careers|Contact Us|Explore Solutions)\b/gi, " ")
            .replace(/[🎓•#|]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 350);
          return isHindiOrHinglish
            ? `${websiteName} ke bare me: ${details}. Hum aapki help ke liye 24/7 available hain!`
            : `About ${websiteName}: ${details}. I am here 24/7 to help answer any questions you have!`;
        }
      }

      // 4B. Check for Schedule / Timeline / Date / Venue query
      if (/schedule|timeline|date|time|timing|venue|auditorium|kab|kahan|kaha|event/i.test(cleanQ)) {
        const scheduleMatch = allKnowledge.match(/(?:Schedule|Timeline|Event Timeline)[\s\S]*?(?=(?:\d+\.|\b===|\bDIRECTIVES|##))/i);
        if (scheduleMatch && scheduleMatch[0].trim()) {
          const details = scheduleMatch[0].slice(0, 400).replace(/\n+/g, " ");
          return isHindiOrHinglish
            ? `${websiteName} schedule aur event timings: ${details}`
            : `Event Schedule for ${websiteName}: ${details}`;
        }
      }

      // 4C. Check for Seat Booking / Pass / Ticket query
      if (/book|pass|seat|ticket|entry|register|roll|lunch|food/i.test(cleanQ)) {
        const bookingMatch = allKnowledge.match(/(?:Seat Booking|Booking|Digital Pass)[\s\S]*?(?=(?:\d+\.|\b===|\bDIRECTIVES|##))/i);
        if (bookingMatch && bookingMatch[0].trim()) {
          const details = bookingMatch[0].slice(0, 400).replace(/\n+/g, " ");
          return isHindiOrHinglish
            ? `Seat booking aur passes ki jaankari: ${details}`
            : `Seat booking & passes information: ${details}`;
        }
      }

      // 4D. Check for FAQ match
      const faqMatches = Array.from(allKnowledge.matchAll(/Q:\s*([^\n]+)\s*\n+\s*A:\s*([^\n]+)/g));
      for (const fm of faqMatches) {
        const qText = fm[1].toLowerCase();
        const aText = fm[2].trim();
        const words = cleanQ.split(/\s+/).filter(w => w.length > 3);
        const matchCount = words.filter(w => qText.includes(w)).length;
        if (matchCount >= 2 || (words.length === 1 && qText.includes(words[0]))) {
          return isHindiOrHinglish
            ? `Aapke sawal ke mutabik: ${aText}`
            : `${aText}`;
        }
      }

      // 5. Default Token-Scoring Fallback
      const tokens = cleanQ.split(/\s+/).filter((t) => t.length > 2);
      const scored = contextChunks.map((chunk) => {
        let score = 0;
        const chunkLower = chunk.toLowerCase();
        for (const token of tokens) {
          if (chunkLower.includes(token)) score += 2;
        }
        return { chunk, score };
      });
      scored.sort((a, b) => b.score - a.score);

      const bestChunk = scored[0]?.chunk || contextChunks[0] || allKnowledge;
      const cleanedText = bestChunk
        .replace(/\[(?:Document|Master)[^\]]+\]/g, "")
        .replace(/=== [^=]+ ===/g, "")
        .replace(/Title:[^\n]+/g, "")
        .replace(/URL:[^\n]+/g, "")
        .replace(/Summary:[^\n]+/g, "")
        .replace(/\n+/g, " ")
        .trim();

      const summary = cleanedText.slice(0, 350);
      return isHindiOrHinglish
        ? `Website ki jaankari ke mutabik: ${summary}... Agar aapko aur information chahiye toh zaroor batayein!`
        : `According to ${websiteName}: ${summary}... Please let me know if you would like more details!`;
    };

    if (!env.gemini.isConfigured) {
      return {
        answer: generateExtractiveAnswer(),
        provider: "grounded_fallback",
        model: "grounded-rag",
      };
    }

    let ai: GoogleGenAI;
    try {
      ai = this.getClient();
    } catch {
      return {
        answer: generateExtractiveAnswer(),
        provider: "grounded_fallback",
        model: "grounded-rag",
      };
    }

    const systemInstruction =
      customSystemPrompt?.trim() ||
      `You are the official, highly intelligent AI Customer Support Assistant for "${websiteName}".
Your mission is to understand the website completely from A-to-Z and provide accurate, friendly, helpful answers to visitors.

Core Directives:
1. Complete Knowledge: You have deep knowledge of ${websiteName}'s services, products, pricing, features, contact methods, phone numbers, email addresses, office locations, and policies based on the verified website knowledge base.
2. Multilingual: If the visitor asks in Hindi, answer in polite, natural Hindi. If asked in Hinglish (Roman Hindi), reply in natural, friendly Hinglish. If in English, reply in clear, professional English. Always match the visitor's language.
3. Clarity & Conciseness: Keep responses direct, helpful, and concise (2-4 sentences). Do not invent information not in the knowledge base.
4. Greetings & General Help: If the visitor greets you or asks who you are or what the website offers, introduce yourself warmly as the official ${websiteName} Assistant and summarize what services/products the site provides.
5. Out-of-Scope: If asked about completely unrelated subjects (like recipes or unrelated math), politely remind them that you are the dedicated support assistant for ${websiteName}.`;

    const contextText =
      contextChunks.length > 0
        ? `=== VERIFIED WEBSITE KNOWLEDGE BASE ===\n${contextChunks.join("\n\n---\n\n")}\n=== END KNOWLEDGE BASE ===`
        : `=== WEBSITE NAME ===\n${websiteName}\nExplain who you are and offer general assistance for ${websiteName}.`;

    const historyText =
      conversationHistory.length > 0
        ? `\n=== RECENT CONVERSATION HISTORY ===\n` +
          conversationHistory
            .slice(-3)
            .map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`)
            .join("\n") +
          `\n=== END HISTORY ===\n`
        : "";

    const prompt = `${contextText}${historyText}\n\nVisitor Question: ${userMessage}\n\nAssistant Response:`;

    // Prioritized fast active Gemini models with low-latency auto-failover
    const modelsToTry = Array.from(
      new Set([
        env.gemini.model || "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
      ])
    );

    for (const modelName of modelsToTry) {
      try {
        const responsePromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            maxOutputTokens: Math.min(env.gemini.maxOutputTokens || 450, 500),
            temperature: 0.25,
          },
        });

        // 2500ms timeout per model to guarantee sub-3s response time
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("MODEL_TIMEOUT")), 2500)
        );

        const response = (await Promise.race([responsePromise, timeoutPromise])) as any;
        const text = response.text?.trim();
        if (text) {
          return {
            answer: text,
            provider: "gemini_api",
            model: modelName,
          };
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[GeminiService] Model ${modelName} error, attempting next candidate:`, errMsg.substring(0, 80));
      }
    }

    return {
      answer: generateExtractiveAnswer(),
      provider: "grounded_fallback",
      model: "grounded-rag",
    };
  }

  /**
   * Automatically generate 3-5 smart suggested questions based on website content
   */
  static async generateSuggestedQuestions(websiteName: string, contentSummaries: string[]): Promise<string[]> {
    if (!env.gemini.isConfigured || contentSummaries.length === 0) {
      return [];
    }

    const ai = this.getClient();
    const prompt = `Based on the following content summary of the website "${websiteName}", generate 3 to 4 short, relevant questions that visitors are most likely to ask.
Return ONLY a valid JSON array of strings, for example: ["Question 1?", "Question 2?", "Question 3?"]

Website Content Summary:
${contentSummaries.slice(0, 3).join("\n\n")}`;

    try {
      const response = await ai.models.generateContent({
        model: env.gemini.model || "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 4).map((q) => String(q).trim());
        }
      }
    } catch (err) {
      console.warn("[GeminiService] Question generation fallback:", err);
    }

    return [];
  }

  /**
   * Backwards compatible method for existing internal routes/tests
   */
  static async generateGroundedReply(
    userMessage: string,
    contextChunks: string[]
  ): Promise<GroundedReplyResult> {
    return this.generateWebsiteReply({
      websiteName: "Curious Rabit AI Solutions",
      userMessage,
      contextChunks,
    });
  }
}
