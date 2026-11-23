import { supabaseRequest } from "../utils/supabase.js";

interface KnowledgeChunkRpcRow {
  id?: string;
  title?: string;
  source_heading?: string;
  source_url?: string;
  content: string;
  rank?: number;
}

const IN_MEMORY_INSTITUTIONAL_DOCS = [
  {
    title: "SupportAI Platform Overview",
    category: "general",
    keywords: ["services", "about", "company", "what do you do", "who are you", "supportai"],
    content:
      "SupportAI is an AI Website Support Chatbot SaaS platform that extracts brand identity, crawls website pages, and trains custom Gemini-powered customer support chatbots for websites.",
  },
  {
    title: "Pricing and Subscription Plans",
    category: "pricing",
    keywords: ["price", "pricing", "cost", "plan", "subscription", "starter", "tier", "rate"],
    content:
      "SupportAI offers flexible multi-tenant tiers: Starter Plan for small business websites, Pro Plan for fast-growing SaaS products, and Enterprise custom tiers for high-volume customer support operations.",
  },
  {
    title: "Website Setup & Crawling",
    category: "setup",
    keywords: ["setup", "crawl", "crawler", "embed", "widget", "code", "install"],
    content:
      "To set up SupportAI on your website, enter your website URL in Chatbot Settings. The system automatically detects your brand theme, colors, fonts, and crawls public pages to generate an instant AI assistant and embed snippet.",
  },
];

export class KnowledgeService {
  /**
   * Retrieve relevant knowledge base chunks for grounding Gemini responses.
   * Scopes search strictly to the specific website when websiteId is provided.
   */
  static async retrieveContext(query: string, websiteId?: string, limit = 4): Promise<string[]> {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Scoped Website Knowledge Search
    if (websiteId) {
      try {
        // Try RPC match_website_knowledge
        const rpcResults = await supabaseRequest<KnowledgeChunkRpcRow[]>("rpc/match_website_knowledge", {
          method: "POST",
          body: {
            p_website_id: websiteId,
            p_query: cleanQuery,
            p_limit: limit,
          },
          timeoutMs: 3500,
        });

        if (Array.isArray(rpcResults) && rpcResults.length > 0) {
          return rpcResults.map((r) => `[Document: ${r.title || "Website Page"}]\n${r.content}`);
        }
      } catch {
        // RPC might not be deployed yet; try direct table query
      }

      try {
        const docs = await supabaseRequest<Array<{ title: string; content: string }>>(
          `knowledge_documents?website_id=eq.${encodeURIComponent(websiteId)}&select=title,content&order=created_at.desc&limit=15`
        );
        if (Array.isArray(docs) && docs.length > 0) {
          // Score docs by query keyword matching
          const tokens = cleanQuery.split(/\s+/).filter((t) => t.length > 2);
          const scored = docs.map((d) => {
            let score = 0;
            const textLower = (d.title + " " + d.content).toLowerCase();
            for (const t of tokens) {
              if (textLower.includes(t)) score += 2;
            }
            return { d, score };
          });
          scored.sort((a, b) => b.score - a.score);
          const top = scored.slice(0, limit).map((s) => `[${s.d.title}]: ${s.d.content}`);
          if (top.length > 0) return top;
        }
      } catch {
        // continue
      }
    }

    // 2. Global RPC match_knowledge_chunks fallback
    try {
      const globalResults = await supabaseRequest<Array<{ document_title: string; content: string }>>("rpc/match_knowledge_chunks", {
        method: "POST",
        body: {
          p_query: cleanQuery,
          p_limit: limit,
        },
        timeoutMs: 2500,
      });

      if (Array.isArray(globalResults) && globalResults.length > 0) {
        return globalResults.map((r) => `[${r.document_title}]: ${r.content}`);
      }
    } catch {
      // ignore
    }

    // 3. In-memory platform fallback
    const queryTokens = cleanQuery
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ""))
      .filter((t) => t.length > 2);

    const matches = IN_MEMORY_INSTITUTIONAL_DOCS.map((doc) => {
      let score = 0;
      for (const kw of doc.keywords) {
        if (cleanQuery.includes(kw)) score += 3;
      }
      for (const token of queryTokens) {
        if (doc.content.toLowerCase().includes(token)) score += 1;
        if (doc.title.toLowerCase().includes(token)) score += 2;
      }
      return { doc, score };
    })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => `[${item.doc.title}]: ${item.doc.content}`);

    return matches;
  }
}
