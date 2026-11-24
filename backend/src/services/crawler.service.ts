import { ApiError } from "../utils/apiError.js";
import { supabaseRequest } from "../utils/supabase.js";
import type { CrawledPage, KnowledgeDocument } from "../types/index.js";

export interface CrawlResult {
  url: string;
  path: string;
  title: string;
  description: string;
  cleanText: string;
}

export interface ExtractedAtoZKnowledge {
  businessName: string;
  domain: string;
  tagline: string;
  overview: string;
  services: string[];
  pricing: string[];
  contactInfo: {
    emails: string[];
    phones: string[];
    address: string;
    hours: string;
  };
  faqs: Array<{ question: string; answer: string }>;
  crawledPagesSummary: Array<{ title: string; url: string; charCount: number }>;
  trainingPrompt: string;
}

export class CrawlerService {
  /**
   * SSRF Protection: Ensure the target URL is a safe, publicly routable HTTP/HTTPS address.
   */
  static validateSafeUrl(rawUrl: string): URL {
    const trimmed = (rawUrl || "").trim();
    if (!trimmed) {
      throw new ApiError(400, "INVALID_URL", "Please provide a valid website URL.");
    }

    // Check for explicit non-http/https protocol
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      if (!/^https?:\/\//i.test(trimmed)) {
        throw new ApiError(400, "INVALID_PROTOCOL", "Only HTTP and HTTPS protocols are allowed.");
      }
    }

    let parsed: URL;
    try {
      parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    } catch {
      throw new ApiError(400, "INVALID_URL", "Please provide a valid website URL.");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new ApiError(400, "INVALID_PROTOCOL", "Only HTTP and HTTPS protocols are allowed.");
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost, link-local, loopback, private RFC1918 and cloud metadata IPs
    const forbiddenPatterns = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/,
      /^0\.0\.0\.0$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
      /^169\.254\.\d+\.\d+$/, // Link-local & cloud metadata
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
    ];

    if (forbiddenPatterns.some((pattern) => pattern.test(host))) {
      throw new ApiError(400, "FORBIDDEN_HOST", "Internal and private network addresses cannot be crawled.");
    }

    // Must be a valid hostname with at least one dot (domain.tld) or valid public IP
    if (!host.includes(".") || host.startsWith(".") || host.endsWith(".")) {
      throw new ApiError(400, "INVALID_URL", "Please provide a valid website domain or URL.");
    }

    return parsed;
  }

  /**
   * Fetch an HTML page with timeout and standard user agent using AbortController
   */
  static async fetchHtml(url: string, timeoutMs = 3500): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SupportAI-Crawler/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      return await response.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiError(502, "FETCH_FAILED", `Failed to reach ${url}: ${msg}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Clean HTML to extract title, description, structured business data, and formatted readable text.
   */
  static extractPageData(html: string, pageUrl: string): CrawlResult {
    const parsed = new URL(pageUrl);

    // 1. Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;

    // 2. Extract meta description
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // 3. Extract JSON-LD structured data if present
    const structuredSnippets: string[] = [];
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const jm of jsonLdMatches) {
      try {
        const parsedJson = JSON.parse(jm[1].trim());
        if (parsedJson) {
          const items = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
          for (const item of items) {
            const type = item["@type"] || "";
            const name = item.name || "";
            const desc = item.description || "";
            const phone = item.telephone || item.phone || "";
            const email = item.email || "";
            const address = typeof item.address === "string" ? item.address : item.address?.streetAddress || "";
            const price = item.priceRange || "";
            if (name || desc || phone || email) {
              structuredSnippets.push(`[Structured Info: ${type || "Business"}] ${name ? `${name}. ` : ""}${desc ? `${desc}. ` : ""}${phone ? `Phone: ${phone}. ` : ""}${email ? `Email: ${email}. ` : ""}${address ? `Address: ${address}. ` : ""}${price ? `Pricing: ${price}.` : ""}`);
            }
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }

    // 4. Extract footer/contact section specifically so business info is never lost
    let footerText = "";
    const footerMatch = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
    if (footerMatch) {
      footerText = footerMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // 5. Structure preservation for body content
    let structured = html
      // Replace headings with Markdown headings
      .replace(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi, "\n\n## $1\n")
      .replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, "\n\n### $1\n")
      // List items
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n• $1")
      // Paragraphs & line breaks
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, "$1 | ")
      // Strip scripts, styles, svgs, comments, nav bars, and noscripts
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");

    // Strip remaining HTML tags
    structured = structured.replace(/<[^>]+>/g, " ");

    // Decode basic HTML entities
    structured = structured
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");

    // Clean whitespace while preserving newlines
    const lines = structured
      .split("\n")
      .map((l) => l.trim().replace(/\s+/g, " "))
      .filter((l) => l.length > 0);
    let cleanText = lines.join("\n");

    // Append structured snippets if found
    if (structuredSnippets.length > 0) {
      cleanText = `${cleanText}\n\n=== VERIFIED STRUCTURED DATA ===\n${structuredSnippets.join("\n")}`;
    }

    // Append footer contact details if extracted
    if (footerText && footerText.length > 10 && !cleanText.includes(footerText.substring(0, 30))) {
      cleanText = `${cleanText}\n\n=== CONTACT, SUPPORT & FOOTER INFO ===\n${footerText.slice(0, 2000)}`;
    }

    // Cap at 25,000 characters per page
    cleanText = cleanText.slice(0, 25000);

    return {
      url: pageUrl,
      path: parsed.pathname || "/",
      title,
      description,
      cleanText,
    };
  }

  /**
   * Find internal links within the same domain, prioritized by business relevance
   */
  static extractInternalLinks(html: string, baseUrl: URL, maxLinks = 15): string[] {
    const linkMatches = html.matchAll(/href=["']([^"']+)["']/gi);
    const discovered = new Set<string>();

    const priorityKeywords = [
      "about", "service", "product", "pricing", "plan", "contact",
      "faq", "feature", "solution", "support", "help", "policy", "terms", "refund", "team"
    ];

    const lowPriorityPatterns = [
      /login/i, /signin/i, /signup/i, /register/i, /cart/i, /checkout/i,
      /account/i, /feed/i, /tag\//i, /category\//i, /page\/\d+/i
    ];

    const scoredLinks: Array<{ url: string; score: number }> = [];

    for (const match of linkMatches) {
      const href = match[1].trim();
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        continue;
      }

      try {
        const resolved = new URL(href, baseUrl.origin);
        // Only same hostname and http/https
        if (resolved.hostname === baseUrl.hostname && ["http:", "https:"].includes(resolved.protocol)) {
          const cleanLink = `${resolved.origin}${resolved.pathname.replace(/\/$/, "")}`;

          // Ignore asset files
          if (!cleanLink.match(/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js|woff2?|ico|xml|mp4)$/i)) {
            if (!discovered.has(cleanLink) && cleanLink !== baseUrl.href.replace(/\/$/, "")) {
              discovered.add(cleanLink);

              let score = 5;
              const pathLower = resolved.pathname.toLowerCase();
              for (const kw of priorityKeywords) {
                if (pathLower.includes(kw)) score += 10;
              }
              for (const lp of lowPriorityPatterns) {
                if (lp.test(pathLower)) score -= 8;
              }

              scoredLinks.push({ url: cleanLink, score });
            }
          }
        }
      } catch {
        // ignore invalid urls
      }
    }

    // Sort links by business relevance score descending
    scoredLinks.sort((a, b) => b.score - a.score);
    return scoredLinks.slice(0, maxLinks).map((s) => s.url);
  }

  /**
   * Crawl homepage and prioritized subpages in fast parallel execution.
   * If initialHtml is provided, the homepage is processed instantly with 0 extra network calls!
   */
  static async crawlWebsite(
    websiteId: string,
    targetUrl: string,
    maxPages = 6,
    initialHtml?: string
  ): Promise<CrawlResult[]> {
    const rootUrl = this.validateSafeUrl(targetUrl);
    const results: CrawlResult[] = [];
    const visited = new Set<string>();

    // 1. Process Homepage (Instant if initialHtml was passed)
    let homepageHtml = initialHtml || "";
    if (!homepageHtml) {
      try {
        homepageHtml = await this.fetchHtml(rootUrl.href, 3500);
      } catch {
        // failed to fetch root
      }
    }

    let candidateSubpages: string[] = [];
    if (homepageHtml) {
      visited.add(rootUrl.href);
      const rootPageData = this.extractPageData(homepageHtml, rootUrl.href);
      results.push(rootPageData);

      // Extract high-value internal links
      candidateSubpages = this.extractInternalLinks(homepageHtml, rootUrl, maxPages - 1);
    }

    // 2. Fetch top subpages in fast parallel execution (Single batch, 3.5s max)
    if (candidateSubpages.length > 0) {
      const subpageResults = await Promise.all(
        candidateSubpages.map(async (url) => {
          visited.add(url);
          try {
            const html = await this.fetchHtml(url, 3500);
            const pageData = this.extractPageData(html, url);

            // Fast SPA text extraction fallback if body is sparse (< 50 chars)
            if (pageData.cleanText.length < 50) {
              const scriptMatches = Array.from(html.matchAll(/src=["']([^"']+\.js[^"']*)["']/gi)).map((m) => m[1]);
              const localScripts = scriptMatches
                .filter((s) => !s.startsWith("http") || s.includes(rootUrl.hostname))
                .slice(0, 2);

              const extractedSnippets: string[] = [];
              for (const s of localScripts) {
                try {
                  const sUrl = new URL(s, rootUrl.origin).href;
                  const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(1500) });
                  if (sRes.ok) {
                    const js = await sRes.text();
                    const strRegex = /["'`]([A-Z][^"'`\n\r]{10,200})["'`]/g;
                    let sm: RegExpExecArray | null;
                    while ((sm = strRegex.exec(js)) !== null) {
                      const text = sm[1].trim();
                      if (
                        !text.includes("__") &&
                        !text.includes("webpack") &&
                        !text.includes("node_modules") &&
                        !text.includes("function") &&
                        /[a-z]/.test(text)
                      ) {
                        extractedSnippets.push(text);
                        if (extractedSnippets.length >= 40) break;
                      }
                    }
                  }
                } catch {
                  // ignore
                }
              }

              if (extractedSnippets.length > 0) {
                pageData.cleanText = `${pageData.title}. Platform Overview & Features:\n${extractedSnippets.join(". ")}`;
              }
            }

            return { success: true as const, pageData };
          } catch {
            return { success: false as const };
          }
        })
      );

      for (const item of subpageResults) {
        if (item.success && item.pageData.cleanText.length > 20) {
          results.push(item.pageData);
        }
      }
    }

    // 3. Persist to Supabase if pages were crawled
    if (results.length > 0) {
      // 3A. Batch insert crawled_pages
      try {
        await supabaseRequest<CrawledPage[]>("crawled_pages", {
          method: "POST",
          prefer: "resolution=merge-duplicates",
          body: results.map((pageData) => ({
            website_id: websiteId,
            url: pageData.url,
            path: pageData.path,
            title: pageData.title,
            description: pageData.description,
            clean_text: pageData.cleanText,
            status: "crawled",
          })),
        });
      } catch (dbErr) {
        console.error("[Crawler] Failed to batch insert crawled pages:", dbErr);
      }

      // 3B. Batch insert knowledge_documents with rich semantic sectioning
      const docsToInsert: Array<{
        website_id: string;
        title: string;
        source_type: "crawled_page";
        source_url: string;
        content: string;
      }> = [];

      for (const pageData of results) {
        // Page overview document
        docsToInsert.push({
          website_id: websiteId,
          title: pageData.title || `Page ${pageData.path}`,
          source_type: "crawled_page",
          source_url: pageData.url,
          content: `Title: ${pageData.title}\nURL: ${pageData.url}\nSummary: ${pageData.description}\n\nContent:\n${pageData.cleanText}`,
        });

        // Split into heading-based sections if available
        const sections = pageData.cleanText.split(/\n(?=## )/g);
        if (sections.length > 1) {
          for (const sec of sections) {
            const secHeadingMatch = sec.match(/^##\s*([^\n]+)/);
            const heading = secHeadingMatch ? secHeadingMatch[1].trim() : "Section";
            if (sec.length > 100 && sec.length < 6000) {
              docsToInsert.push({
                website_id: websiteId,
                title: `${pageData.title} - ${heading}`,
                source_type: "crawled_page",
                source_url: pageData.url,
                content: `Page: ${pageData.title} (${pageData.url})\nSection: ${heading}\n\n${sec}`,
              });
            }
          }
        }
      }

      try {
        await supabaseRequest<KnowledgeDocument[]>("knowledge_documents", {
          method: "POST",
          prefer: "return=representation",
          body: docsToInsert,
        });
      } catch (dbErr) {
        console.error("[Crawler] Failed to batch insert knowledge documents:", dbErr);
      }
    }

    return results;
  }

  /**
   * Intelligently extract comprehensive A-to-Z business knowledge from crawled pages
   * and compile a master training prompt for the AI Chatbot.
   */
  static extractAtoZKnowledge(
    results: CrawlResult[],
    domain: string,
    brandName: string
  ): ExtractedAtoZKnowledge {
    const homePage = results.find((r) => r.path === "/" || r.path === "") || results[0];
    const aboutPage = results.find((r) => /about/i.test(r.path) || /about/i.test(r.title));
    const servicesPage = results.find((r) => /service/i.test(r.path) || /product/i.test(r.path) || /solution/i.test(r.path));
    const contactPage = results.find((r) => /contact/i.test(r.path) || /support/i.test(r.path));
    const pricingPage = results.find((r) => /pricing/i.test(r.path) || /plan/i.test(r.path));
    const faqPage = results.find((r) => /faq/i.test(r.path) || /help/i.test(r.path));

    const allText = results.map((r) => `${r.title}\n${r.cleanText}`).join("\n\n");

    // 1. Tagline / Headline
    const tagline = homePage?.description || homePage?.title || `${brandName} Official Website`;

    // 2. Overview / About Us
    let overview = "";
    if (aboutPage && aboutPage.cleanText.length > 50) {
      overview = aboutPage.cleanText.slice(0, 1000);
    } else if (homePage) {
      const paras = homePage.cleanText
        .split("\n\n")
        .filter(
          (p) =>
            p.length > 40 &&
            !p.startsWith("##") &&
            !p.startsWith("===") &&
            !p.includes("Home Solutions Team") &&
            !p.includes("Explore Solutions")
        );
      overview = paras.slice(0, 3).join("\n\n").slice(0, 1000);
    }
    if (!overview || overview.length < 30) {
      overview = tagline ? `${tagline}. ${brandName} is a premier platform offering high quality solutions on ${domain}.` : `${brandName} is a premier platform offering high quality solutions on ${domain}.`;
    }

    // 3. Extract Services / Products
    const servicesSet = new Set<string>();
    const serviceLines = (servicesPage ? `${servicesPage.cleanText}\n${allText}` : allText)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const line of serviceLines) {
      if (
        (line.startsWith("## ") || line.startsWith("### ") || line.startsWith("• ")) &&
        /service|feature|product|solution|development|design|ai|cloud|consulting|management|support|automation|api/i.test(line) &&
        line.length > 5 &&
        line.length < 150
      ) {
        servicesSet.add(line.replace(/^[#•\s]+/, "").trim());
      }
      if (servicesSet.size >= 8) break;
    }

    if (servicesSet.size === 0) {
      // Fallback service detection from top headings
      for (const line of serviceLines) {
        if (line.startsWith("## ") && line.length < 100 && !/contact|privacy|term|cookie/i.test(line)) {
          servicesSet.add(line.replace(/^##\s*/, "").trim());
        }
        if (servicesSet.size >= 6) break;
      }
    }

    const services = Array.from(servicesSet);

    // 4. Extract Pricing, Plans & Terms
    const pricingSet = new Set<string>();
    const pricingLines = (pricingPage ? `${pricingPage.cleanText}\n${allText}` : allText)
      .split("\n")
      .map((l) => l.trim());

    for (const line of pricingLines) {
      if (
        /([$₹€]|USD|INR|Rs\.?|\/mo|\/month|\/yr|\bfree\b|\bpricing\b|\bplan\b|\brefund\b)/i.test(line) &&
        line.length > 10 &&
        line.length < 200
      ) {
        pricingSet.add(line.replace(/^[#•\s]+/, "").trim());
      }
      if (pricingSet.size >= 6) break;
    }
    const pricing = Array.from(pricingSet);

    // 5. Contact Information (Emails, Phones, Address, Hours)
    const emails = Array.from(
      new Set(
        (allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
          .filter((e) => !e.match(/\.(png|jpg|jpeg|gif|svg|webp|js|css)$/i))
      )
    );

    const rawPhones = allText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}/g) || [];
    const phones = Array.from(
      new Set(
        rawPhones
          .map((p) => p.trim())
          .filter((p) => p.replace(/\D/g, "").length >= 10 && p.replace(/\D/g, "").length <= 15)
      )
    );

    let address = "";
    const addressMatch = allText.match(/(?:address|location|office|headquarters)[\s:]+([^\n]{10,200})/i);
    if (addressMatch) {
      address = addressMatch[1].trim();
    }

    let hours = "";
    const hoursMatch = allText.match(/(?:hours|timings?|support hours|operating hours)[\s:]+([^\n]{6,120})/i);
    if (hoursMatch) {
      hours = hoursMatch[1].trim();
    } else if (allText.includes("24/7")) {
      hours = "24/7 Live Online AI Support";
    }

    // 6. Frequently Asked Questions (FAQs)
    const faqs: Array<{ question: string; answer: string }> = [];
    const faqSource = faqPage ? faqPage.cleanText : allText;
    const qMatches = Array.from(faqSource.matchAll(/(?:^|\n)(?:Q[:.]|\d+[:.]|##\s*)?\s*([A-Z][^\n?]+\?)\s*\n+([^#\n][^\n]+)/g));

    for (const qm of qMatches) {
      const q = qm[1].trim();
      const a = qm[2].trim();
      if (q.length > 10 && a.length > 15 && !faqs.some((f) => f.question === q)) {
        faqs.push({ question: q, answer: a.slice(0, 300) });
      }
      if (faqs.length >= 6) break;
    }

    // 7. Crawled Pages Summary
    const crawledPagesSummary = results.map((r) => ({
      title: r.title || r.path,
      url: r.url,
      charCount: r.cleanText.length,
    }));

    // 8. Generate Authoritative Master Training Prompt
    const servicesSection = services.length > 0
      ? services.map((s) => `• ${s}`).join("\n")
      : `• Full spectrum of products and online services offered by ${brandName}.`;

    const pricingSection = pricing.length > 0
      ? pricing.map((p) => `• ${p}`).join("\n")
      : `• Transparent and flexible pricing tailored for clients of ${brandName}. Contact support for tailored quotes.`;

    const contactSection = [
      emails.length > 0 ? `- Email: ${emails.join(", ")}` : `- Email: support@${domain}`,
      phones.length > 0 ? `- Phone: ${phones.join(", ")}` : `- Phone: Contact via website support form`,
      address ? `- Address: ${address}` : null,
      hours ? `- Hours: ${hours}` : `- Hours: 24/7 AI Assistance, Human Team Mon-Fri`,
    ].filter(Boolean).join("\n");

    const faqsSection = faqs.length > 0
      ? faqs.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join("\n\n")
      : `1. Q: What does ${brandName} provide?\n   A: ${overview.slice(0, 250)}`;

    const pageExcerpts = results
      .slice(0, 4)
      .map((r) => `[Source Page: ${r.title} (${r.url})]\n${r.cleanText.slice(0, 800)}`)
      .join("\n\n---\n\n");

    const trainingPrompt = `You are the official, highly intelligent AI Customer Support Assistant for "${brandName}" (https://${domain}).
You have been trained thoroughly on all A-to-Z information of this website.

=== VERIFIED A-TO-Z BUSINESS KNOWLEDGE BASE ===
1. BUSINESS NAME: ${brandName}
2. WEBSITE URL: https://${domain}
3. TAGLINE / SUMMARY: ${tagline}

4. ABOUT US & COMPANY OVERVIEW:
${overview}

5. CORE SERVICES, PRODUCTS & CAPABILITIES:
${servicesSection}

6. PRICING, PLANS & PACKAGES:
${pricingSection}

7. CONTACT & CUSTOMER SUPPORT:
${contactSection}

8. VERIFIED FREQUENTLY ASKED QUESTIONS:
${faqsSection}

9. VERIFIED CRAWLED SITE ARCHIVE:
${pageExcerpts}
=== END VERIFIED KNOWLEDGE BASE ===

DIRECTIVES:
- You have complete A-to-Z comprehension of "${brandName}".
- Always answer user questions accurately, politely, and directly based on the verified knowledge above.
- Support English, Hindi, and Hinglish (Roman Hindi) natively:
  * If asked in Hindi, respond in polite Hindi.
  * If asked in Hinglish, respond in natural Hinglish.
  * If asked in English, respond in clear, professional English.
- If asked for contact details, pricing, services, or about the company, provide the exact verified details listed above.
- Never make up information not found in this training base; if something is not listed, politely offer the official contact email/phone.`;

    return {
      businessName: brandName,
      domain,
      tagline,
      overview,
      services,
      pricing,
      contactInfo: {
        emails,
        phones,
        address,
        hours,
      },
      faqs,
      crawledPagesSummary,
      trainingPrompt,
    };
  }
}
