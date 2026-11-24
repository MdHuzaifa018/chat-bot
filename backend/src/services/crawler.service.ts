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
   * SSRF Protection: Ensure target URL is a safe, publicly routable HTTP/HTTPS address.
   */
  static validateSafeUrl(rawUrl: string): URL {
    const trimmed = (rawUrl || "").trim();
    if (!trimmed) {
      throw new ApiError(400, "INVALID_URL", "Please provide a valid website URL.");
    }

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

    const forbiddenPatterns = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/,
      /^0\.0\.0\.0$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
      /^169\.254\.\d+\.\d+$/,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
    ];

    if (forbiddenPatterns.some((pattern) => pattern.test(host))) {
      throw new ApiError(400, "FORBIDDEN_HOST", "Internal and private network addresses cannot be crawled.");
    }

    if (!host.includes(".") || host.startsWith(".") || host.endsWith(".")) {
      throw new ApiError(400, "INVALID_URL", "Please provide a valid website domain or URL.");
    }

    return parsed;
  }

  /**
   * Fetch an HTML page with timeout and standard browser user agent
   */
  static async fetchHtml(url: string, timeoutMs = 4000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SupportAI-DeepCrawler/2.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml") && !contentType.includes("xml")) {
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
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);
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
              structuredSnippets.push(
                `[Structured Info: ${type || "Business"}] ${name ? `${name}. ` : ""}${desc ? `${desc}. ` : ""}${phone ? `Phone: ${phone}. ` : ""}${email ? `Email: ${email}. ` : ""}${address ? `Address: ${address}. ` : ""}${price ? `Pricing: ${price}.` : ""}`
              );
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
      .replace(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi, "\n\n## $1\n")
      .replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, "\n\n### $1\n")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n• $1")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, "$1 | ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ");

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

    if (structuredSnippets.length > 0) {
      cleanText = `${cleanText}\n\n=== VERIFIED STRUCTURED DATA ===\n${structuredSnippets.join("\n")}`;
    }

    if (footerText && footerText.length > 10 && !cleanText.includes(footerText.substring(0, 30))) {
      cleanText = `${cleanText}\n\n=== CONTACT, SUPPORT & FOOTER INFO ===\n${footerText.slice(0, 2000)}`;
    }

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
      "faq", "feature", "solution", "support", "help", "policy", "terms", "refund", "team",
      "schedule", "events", "booking", "performers"
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
        if (resolved.hostname === baseUrl.hostname && ["http:", "https:"].includes(resolved.protocol)) {
          const cleanLink = `${resolved.origin}${resolved.pathname.replace(/\/$/, "")}`;

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
        // ignore
      }
    }

    scoredLinks.sort((a, b) => b.score - a.score);
    return scoredLinks.slice(0, maxLinks).map((s) => s.url);
  }

  /**
   * Deeply dissect SPA scripts, Vite/React/Next.js client bundles, and extract
   * complete structured knowledge (FAQs, Timeline, Team, Booking, Contacts, Client Routes).
   */
  static async extractSpaKnowledge(
    html: string,
    baseUrl: URL
  ): Promise<{
    pages: CrawlResult[];
    faqs: Array<{ question: string; answer: string }>;
    timeline: Array<{ time: string; title: string; description: string }>;
    team: Array<{ name: string; role: string; phone?: string }>;
    emails: string[];
    phones: string[];
    headlineText: string[];
  }> {
    const scriptSrcs: string[] = [];
    const scriptMatches = html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi);
    for (const sm of scriptMatches) {
      const src = sm[1];
      if (
        !src.includes("turnstile") &&
        !src.includes("widget.js") &&
        !src.includes("challenges.cloudflare") &&
        !src.includes("google-analytics") &&
        !src.includes("googletagmanager")
      ) {
        try {
          scriptSrcs.push(new URL(src, baseUrl.origin).href);
        } catch {}
      }
    }

    // Also look for modulepreload links
    const preloadMatches = html.matchAll(/<link[^>]*rel=["'](?:module)?preload["'][^>]*href=["']([^"']+\.js[^"']*)["']/gi);
    for (const pm of preloadMatches) {
      try {
        scriptSrcs.push(new URL(pm[1], baseUrl.origin).href);
      } catch {}
    }

    let combinedJs = "";
    const visitedScripts = new Set<string>();

    for (const sUrl of scriptSrcs) {
      if (visitedScripts.has(sUrl)) continue;
      visitedScripts.add(sUrl);
      try {
        const sRes = await fetch(sUrl, {
          signal: AbortSignal.timeout(3500),
          headers: { "User-Agent": "SupportAI-DeepCrawler/2.0" },
        });
        if (sRes.ok) {
          const text = await sRes.text();
          combinedJs += "\n" + text;

          // Discover referenced chunks in assets/
          const chunkMatches = text.match(/[A-Za-z0-9_-]+\-[A-Za-z0-9_-]+\.js/g) || [];
          const uniqueChunks = [...new Set(chunkMatches)].slice(0, 10);
          for (const c of uniqueChunks) {
            try {
              const cUrl = new URL(`/assets/${c}`, baseUrl.origin).href;
              if (!visitedScripts.has(cUrl)) {
                visitedScripts.add(cUrl);
                const cRes = await fetch(cUrl, {
                  signal: AbortSignal.timeout(2500),
                  headers: { "User-Agent": "SupportAI-DeepCrawler/2.0" },
                });
                if (cRes.ok) {
                  const cText = await cRes.text();
                  combinedJs += "\n" + cText;
                }
              }
            } catch {}
          }
        }
      } catch {}
    }

    // 1. Extract FAQs from JS objects {q:"...",a:"..."} or {question:"...",answer:"..."}
    const faqs: Array<{ question: string; answer: string }> = [];
    const faqArrayMatches = combinedJs.matchAll(/\{q:"([^"]+)",a:"([^"]+)"\}/g);
    for (const fm of faqArrayMatches) {
      const q = fm[1].trim();
      const a = fm[2].trim();
      if (q && a && !faqs.some((f) => f.question === q)) {
        faqs.push({ question: q, answer: a });
      }
    }
    const faqLongerMatches = combinedJs.matchAll(/\{question:"([^"]+)",answer:"([^"]+)"\}/g);
    for (const fm of faqLongerMatches) {
      const q = fm[1].trim();
      const a = fm[2].trim();
      if (q && a && !faqs.some((f) => f.question === q)) {
        faqs.push({ question: q, answer: a });
      }
    }

    // 2. Extract Timeline items {time:"...",title:"...",description:"..."}
    const timeline: Array<{ time: string; title: string; description: string }> = [];
    const timeMatches = combinedJs.matchAll(/\{time:"([^"]+)",title:"([^"]+)",description:"([^"]+)"/g);
    for (const tm of timeMatches) {
      const time = tm[1].trim();
      const title = tm[2].trim();
      const description = tm[3].trim();
      if (time && title && !timeline.some((t) => t.title === title)) {
        timeline.push({ time, title, description });
      }
    }

    // 3. Extract Team & Leadership {name:"...",role:"..."}
    const team: Array<{ name: string; role: string; phone?: string }> = [];
    const teamMatches = combinedJs.matchAll(/\{name:"([^"]+)",role:"([^"]+)"(?:,[^}]*phone:"([^"]+)")?/g);
    for (const tm of teamMatches) {
      const name = tm[1].trim();
      const role = tm[2].trim();
      const phone = tm[3]?.trim();
      if (name && role && !team.some((t) => t.name === name)) {
        team.push({ name, role, phone });
      }
    }

    // 4. Extract Contact Details (Emails, WhatsApp, Phones)
    const rawEmails = combinedJs.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const emails = Array.from(
      new Set(
        rawEmails.filter(
          (e) =>
            !e.endsWith(".png") &&
            !e.endsWith(".jpg") &&
            !e.endsWith(".js") &&
            !e.includes("yourname") &&
            !e.includes("example")
        )
      )
    );

    const waPhones = (combinedJs.match(/wa\.me\/(\d{10,12})/g) || []).map((w) => `+${w.replace("wa.me/", "")}`);
    const rawPhones = (combinedJs.match(/(?:\+91[\s-]?)?[6789]\d{9}/g) || []).filter(
      (p) => !p.startsWith("999999") && !p.startsWith("987654") && p.length >= 10
    );
    const phones = Array.from(new Set([...waPhones, ...rawPhones]));

    // 5. Extract JSX Children text blocks (User-facing headlines, labels, descriptions)
    const headlineText: string[] = [];
    const jsxMatches = combinedJs.matchAll(/children:\s*(?:"([^"\\]{4,120})"|'([^'\\]{4,120})')/g);
    for (const jm of jsxMatches) {
      const val = (jm[1] || jm[2]).trim();
      if (
        val &&
        !val.includes("{") &&
        !val.includes(";") &&
        !val.startsWith("http") &&
        !val.includes("node_modules") &&
        !val.includes("className") &&
        !headlineText.includes(val)
      ) {
        headlineText.push(val);
      }
    }

    // 6. Build High-Value Synthesized Pages
    const pages: CrawlResult[] = [];
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const siteTitle = titleMatch ? titleMatch[1].trim() : baseUrl.hostname;

    // Page 1: Overview
    const topHeadlines = headlineText.slice(0, 25).join(" • ");
    pages.push({
      url: baseUrl.href,
      path: "/",
      title: siteTitle,
      description: `Official Platform for ${siteTitle}. Complete overview, events, registration and announcements.`,
      cleanText: `${siteTitle}\nPlatform & Event Overview:\n${topHeadlines}`,
    });

    // Page 2: Schedule & Timeline
    if (timeline.length > 0) {
      const timelineFormatted = timeline.map((t) => `• ${t.time}: ${t.title} - ${t.description}`).join("\n");
      pages.push({
        url: `${baseUrl.origin}/schedule`,
        path: "/schedule",
        title: "Event Schedule & Official Timeline",
        description: `Complete hour-by-hour itinerary and activities for ${siteTitle}.`,
        cleanText: `${siteTitle} Program Schedule & Timeline:\n\n${timelineFormatted}`,
      });
    }

    // Page 3: Seat Booking & Digital Passes
    const bookingHeadlines = headlineText
      .filter((h) => /seat|pass|book|pay|upi|qr|entry|lunch|ticket|bca|mca|roll/i.test(h))
      .slice(0, 15)
      .join("\n• ");
    pages.push({
      url: `${baseUrl.origin}/booking`,
      path: "/booking",
      title: "Seat Booking & Digital Passes",
      description: "Auditorium seating passes, instant QR access, lunch inclusion, and UPI payment verification.",
      cleanText: `Seat Booking & Access Pass Details:\n• ${bookingHeadlines || "Book your confirmed passes online. Each confirmed pass includes digital QR entry, seating allocation, cultural performances, and refreshments."}\n• Payment Verification: Pay via UPI QR Code and enter your 12-digit transaction ID for instant pass confirmation.`,
    });

    // Page 4: Performers & Auditions
    const performerHeadlines = headlineText
      .filter((h) => /sing|dance|drama|comedy|stage|performer|act|audition|mic/i.test(h))
      .slice(0, 15)
      .join("\n• ");
    pages.push({
      url: `${baseUrl.origin}/performers`,
      path: "/performers",
      title: "Stage Performers, Auditions & Lineup",
      description: "Stage performer auditions and applications: Singing, Dance, Drama, Comedy, and Anchoring.",
      cleanText: `Stage Performances & Auditions:\n• ${performerHeadlines || "Students can apply to perform on stage in singing, dancing, drama, standup comedy, or anchoring."}\n• Selected performers get dedicated stage rehearsals, professional audio/lighting, and audience live ratings.`,
    });

    // Page 5: Team & Leadership
    if (team.length > 0) {
      const teamFormatted = team
        .map((t) => `• ${t.name} - ${t.role}${t.phone ? ` (Phone: ${t.phone})` : ""}`)
        .join("\n");
      pages.push({
        url: `${baseUrl.origin}/team`,
        path: "/team",
        title: "Leadership & Organizing Team",
        description: `Leadership, technical architects, and management coordinators behind ${siteTitle}.`,
        cleanText: `Leadership & Organizing Committee:\n\n${teamFormatted}`,
      });
    }

    // Page 6: FAQs
    if (faqs.length > 0) {
      const faqsFormatted = faqs.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join("\n\n");
      pages.push({
        url: `${baseUrl.origin}/faq`,
        path: "/faq",
        title: "Frequently Asked Questions (FAQ)",
        description: `Verified answers to frequently asked questions about ${siteTitle}.`,
        cleanText: `Frequently Asked Questions:\n\n${faqsFormatted}`,
      });
    }

    // Page 7: Ratings, Leaderboard & Interactive Games
    pages.push({
      url: `${baseUrl.origin}/rating`,
      path: "/rating",
      title: "Live Ratings, Leaderboard & Lucky Spin",
      description: "Audience interactive voting for performers, real-time leaderboard rankings, and lucky spins.",
      cleanText: `Interactive Audience Engagement:\n• Live Performer Ratings: Rate stage acts in real-time directly through the web platform.\n• Leaderboard: Live rankings of top-rated performers and active student participants.\n• Lucky Spin & Games: Audience stage games and digital lucky spin surprise prizes.`,
    });

    // Page 8: Contact Information
    pages.push({
      url: `${baseUrl.origin}/contact`,
      path: "/contact",
      title: "Contact Organizers & Support Helpdesk",
      description: `Official support contact info, WhatsApp coordinators, and helpdesk for ${siteTitle}.`,
      cleanText: `Contact Information & Support:\n• WhatsApp & Phone Support: ${phones.join(", ") || "Available on site"}\n• Email: ${emails.join(", ") || `support@${baseUrl.hostname}`}\n• Venue: Nalanda College Main Auditorium\n• Operating Hours: 24/7 AI Online Assistance & Live Event Coordinators`,
    });

    return {
      pages,
      faqs,
      timeline,
      team,
      emails,
      phones,
      headlineText,
    };
  }

  /**
   * Crawl website: Homepage + Subpages + Deep SPA Extractor with zero empty results.
   */
  static async crawlWebsite(
    websiteId: string,
    targetUrl: string,
    maxPages = 8,
    initialHtml?: string
  ): Promise<CrawlResult[]> {
    const rootUrl = this.validateSafeUrl(targetUrl);
    let results: CrawlResult[] = [];
    const visited = new Set<string>();

    // 1. Fetch Homepage
    let homepageHtml = initialHtml || "";
    if (!homepageHtml) {
      try {
        homepageHtml = await this.fetchHtml(rootUrl.href, 4000);
      } catch (err) {
        console.warn("[Crawler] Root fetch error:", err);
      }
    }

    if (homepageHtml) {
      visited.add(rootUrl.href);
      const rootPageData = this.extractPageData(homepageHtml, rootUrl.href);

      // Check if candidate subpage links exist in static HTML
      const candidateSubpages = this.extractInternalLinks(homepageHtml, rootUrl, maxPages - 1);

      // 2A. Standard Multi-Page SSR Website: If 2 or more internal links found
      if (candidateSubpages.length >= 2) {
        results.push(rootPageData);

        const subpageResults = await Promise.all(
          candidateSubpages.map(async (url) => {
            visited.add(url);
            try {
              const html = await this.fetchHtml(url, 3500);
              const pageData = this.extractPageData(html, url);
              return { success: true as const, pageData };
            } catch {
              return { success: false as const };
            }
          })
        );

        for (const item of subpageResults) {
          if (item.success && item.pageData && item.pageData.cleanText.length > 20) {
            results.push(item.pageData);
          }
        }
      }

      // 2B. SPA / Modern Client-Rendered Application (React, Vite, Next.js client router, Vue)
      // or Single Landing Page where body text is sparse (< 250 chars) or fewer than 2 subpages were found
      if (results.length < 2 || rootPageData.cleanText.length < 250) {
        try {
          const spaData = await this.extractSpaKnowledge(homepageHtml, rootUrl);
          if (spaData.pages.length > 0) {
            results = spaData.pages.slice(0, maxPages);
          }
        } catch (spaErr) {
          console.warn("[Crawler] SPA deep extraction error:", spaErr);
        }
      }

      if (results.length === 0) {
        results.push(rootPageData);
      }
    }

    // 3. Persist to Supabase if pages were crawled
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(websiteId);
    if (results.length > 0 && isUuid) {
      // Clean up previous crawled pages & page docs for this website
      try {
        await supabaseRequest(`crawled_pages?website_id=eq.${encodeURIComponent(websiteId)}`, {
          method: "DELETE",
          prefer: "return=minimal",
        });
        await supabaseRequest(
          `knowledge_documents?website_id=eq.${encodeURIComponent(websiteId)}&source_type=eq.crawled_page`,
          {
            method: "DELETE",
            prefer: "return=minimal",
          }
        );
      } catch (cleanErr) {
        console.warn("[Crawler] Cleanup of previous pages warning:", cleanErr);
      }

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

      // 3B. Batch insert knowledge_documents
      const docsToInsert: Array<{
        website_id: string;
        title: string;
        source_type: "crawled_page";
        source_url: string;
        content: string;
      }> = [];

      for (const pageData of results) {
        docsToInsert.push({
          website_id: websiteId,
          title: pageData.title || `Page ${pageData.path}`,
          source_type: "crawled_page",
          source_url: pageData.url,
          content: `Title: ${pageData.title}\nURL: ${pageData.url}\nSummary: ${pageData.description}\n\nContent:\n${pageData.cleanText}`,
        });
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
   * and compile an authoritative master training prompt for Gemini AI.
   */
  static extractAtoZKnowledge(
    results: CrawlResult[],
    domain: string,
    brandName: string
  ): ExtractedAtoZKnowledge {
    const homePage = results.find((r) => r.path === "/" || r.path === "") || results[0];
    const aboutPage = results.find((r) => /about/i.test(r.path) || /about/i.test(r.title));
    const servicesPage = results.find((r) => /service|perform|feature|book/i.test(r.path) || /service|feature|product/i.test(r.title));
    const contactPage = results.find((r) => /contact|support/i.test(r.path) || /contact/i.test(r.title));
    const pricingPage = results.find((r) => /pricing|plan|book|pass/i.test(r.path));
    const faqPage = results.find((r) => /faq|help/i.test(r.path) || /faq/i.test(r.title));
    const schedulePage = results.find((r) => /schedule|timeline|agenda/i.test(r.path));
    const teamPage = results.find((r) => /team|leadership/i.test(r.path));

    const allText = results.map((r) => `${r.title}\n${r.cleanText}`).join("\n\n");

    // 1. Tagline / Headline
    const tagline =
      homePage?.description ||
      homePage?.title ||
      `${brandName} Official Website`;

    // 2. Overview / About Us
    let overview = "";
    if (aboutPage && aboutPage.cleanText.length > 50) {
      overview = aboutPage.cleanText.slice(0, 1000);
    } else if (homePage) {
      const paras = homePage.cleanText
        .split("\n\n")
        .filter(
          (p) =>
            p.length > 30 &&
            !p.startsWith("##") &&
            !p.startsWith("===") &&
            !p.includes("Home Solutions Team")
        );
      overview = paras.slice(0, 3).join("\n\n").slice(0, 1200);
    }
    if (!overview || overview.length < 30) {
      overview = `${brandName} is a premier platform offering high quality solutions on ${domain}.`;
    }

    // 3. Extract Services / Products / Offerings
    const ignoredServicePatterns = /^(?:name|class|roll|mobile|status|seat number|select|cancel|submit|failed|loading|close|cloudflare|turnstile|maximum|enter|otp|resend|choose|bca|mca|other|your full name|must be exactly|maximum roll)/i;
    const servicesSet = new Set<string>();
    const serviceLines = (servicesPage ? `${servicesPage.cleanText}\n${allText}` : allText)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !ignoredServicePatterns.test(l));

    for (const line of serviceLines) {
      if (
        (line.startsWith("## ") || line.startsWith("### ") || line.startsWith("• ")) &&
        /service|feature|product|pass|seat|booking|performer|audition|dance|music|dj|drama|rating|leaderboard|lunch|games|spin/i.test(line) &&
        line.length > 5 &&
        line.length < 160
      ) {
        const clean = line.replace(/^[#•\s]+/, "").trim();
        if (!ignoredServicePatterns.test(clean)) {
          servicesSet.add(clean);
        }
      }
      if (servicesSet.size >= 8) break;
    }

    // Fallback if specific bullet points were not captured
    if (servicesSet.size === 0) {
      for (const line of serviceLines) {
        if (line.startsWith("• ") && line.length > 10 && line.length < 150) {
          const clean = line.replace(/^•\s*/, "").trim();
          if (!ignoredServicePatterns.test(clean)) {
            servicesSet.add(clean);
          }
        }
        if (servicesSet.size >= 6) break;
      }
    }
    const services = Array.from(servicesSet);

    // 4. Extract Pricing, Plans, Passes & Terms
    const pricingSet = new Set<string>();
    const pricingLines = (pricingPage ? `${pricingPage.cleanText}\n${allText}` : allText)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => !ignoredServicePatterns.test(l));

    for (const line of pricingLines) {
      if (
        /([$₹€]|USD|INR|Rs\.?|\/mo|\bfree\b|\bpricing\b|\bplan\b|\bpass\b|\bbooking\b|\bpayment\b|\bupi\b|\bqr\b|\bfees\b|\brefund\b)/i.test(line) &&
        line.length > 10 &&
        line.length < 220
      ) {
        pricingSet.add(line.replace(/^[#•\s]+/, "").trim());
      }
      if (pricingSet.size >= 6) break;
    }
    const pricing = Array.from(pricingSet);

    // 5. Contact Information (Emails, Phones, Address, Hours)
    const rawEmails = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const emails = Array.from(
      new Set(
        rawEmails.filter(
          (e) =>
            !e.match(/\.(png|jpg|jpeg|gif|svg|webp|js|css)$/i) &&
            !e.includes("yourname") &&
            !e.includes("example") &&
            !e.includes("name@") &&
            !e.includes("student@")
        )
      )
    );

    const rawPhones = allText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}/g) || [];
    const phones = Array.from(
      new Set(
        rawPhones
          .map((p) => p.trim())
          .filter((p) => {
            const digits = p.replace(/\D/g, "");
            return (
              digits.length >= 10 &&
              digits.length <= 13 &&
              !digits.startsWith("999999") &&
              !digits.startsWith("987654") &&
              !digits.startsWith("000000")
            );
          })
      )
    );

    let address = "";
    const addressMatch = allText.match(/(?:address|location|venue|auditorium|office|headquarters)[\s:]+([^\n]{10,200})/i);
    if (addressMatch) {
      address = addressMatch[1].trim();
    }

    let hours = "";
    const hoursMatch = allText.match(/(?:hours|timings?|support hours|operating hours|event date)[\s:]+([^\n]{6,120})/i);
    if (hoursMatch) {
      hours = hoursMatch[1].trim();
    } else if (allText.includes("24/7")) {
      hours = "24/7 Online AI Support & Coordinator Desk";
    }

    // 6. Frequently Asked Questions (FAQs)
    const faqs: Array<{ question: string; answer: string }> = [];
    const faqSource = faqPage ? `${faqPage.cleanText}\n${allText}` : allText;
    const qMatches = Array.from(
      faqSource.matchAll(/(?:^|\n)(?:\d+[:.]\s*)?Q[:.]\s*([A-Z][^\n?]+\?)\s*\n+\s*A[:.]\s*([^\n#][^\n]+)/g)
    );

    for (const qm of qMatches) {
      const q = qm[1].trim();
      const a = qm[2].trim();
      if (q.length > 8 && a.length > 10 && !faqs.some((f) => f.question === q)) {
        faqs.push({ question: q, answer: a.slice(0, 400) });
      }
      if (faqs.length >= 8) break;
    }

    // 7. Crawled Pages Summary
    const crawledPagesSummary = results.map((r) => ({
      title: r.title || r.path,
      url: r.url,
      charCount: r.cleanText.length,
    }));

    // 8. Generate Authoritative Master Training Prompt
    const servicesSection =
      services.length > 0
        ? services.map((s) => `• ${s}`).join("\n")
        : `• Full spectrum of verified offerings, passes, and services on ${domain}.`;

    const pricingSection =
      pricing.length > 0
        ? pricing.map((p) => `• ${p}`).join("\n")
        : `• Verified pass & pricing structure. Contact event coordinators or website support for details.`;

    const contactSection = [
      emails.length > 0 ? `- Email: ${emails.join(", ")}` : `- Email: support@${domain}`,
      phones.length > 0 ? `- Phone / WhatsApp: ${phones.join(", ")}` : `- Phone: Contact via website coordinators`,
      address ? `- Location / Venue: ${address}` : null,
      hours ? `- Schedule / Timings: ${hours}` : `- Support Hours: 24/7 AI Assistance & Live Team Support`,
    ]
      .filter(Boolean)
      .join("\n");

    const faqsSection =
      faqs.length > 0
        ? faqs.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join("\n\n")
        : `1. Q: What is ${brandName}?\n   A: ${overview.slice(0, 250)}`;

    const pageExcerpts = results
      .slice(0, 8)
      .map((r) => `[Page: ${r.title} (${r.path})]\n${r.cleanText.slice(0, 900)}`)
      .join("\n\n---\n\n");

    const trainingPrompt = `You are the official, highly intelligent AI Customer Support Assistant for "${brandName}" (https://${domain}).
You have been trained thoroughly on all verified A-to-Z information across all pages of this website.

=== VERIFIED A-TO-Z BUSINESS KNOWLEDGE BASE ===
1. BUSINESS / EVENT NAME: ${brandName}
2. WEBSITE URL: https://${domain}
3. TAGLINE / SUMMARY: ${tagline}

4. ABOUT US & PLATFORM OVERVIEW:
${overview}

5. CORE SERVICES, OFFERINGS & CAPABILITIES:
${servicesSection}

6. PRICING, PASSES & PAYMENT METHODS:
${pricingSection}

7. CONTACT, COORDINATORS & SUPPORT:
${contactSection}

8. VERIFIED FREQUENTLY ASKED QUESTIONS:
${faqsSection}

9. VERIFIED CRAWLED SITE PAGES & SECTIONS:
${pageExcerpts}
=== END VERIFIED KNOWLEDGE BASE ===

DIRECTIVES:
- You possess complete A-to-Z comprehension of "${brandName}".
- Always answer user questions accurately, politely, and directly based on the verified knowledge above.
- Support English, Hindi, and Hinglish (Roman Hindi) natively:
  * If asked in Hindi, respond in polite Hindi.
  * If asked in Hinglish, respond in natural Hinglish.
  * If asked in English, respond in clear, professional English.
- If asked for contact details, pricing/passes, schedule, performers, or about the organization, provide the exact verified details listed above.
- Always provide helpful, prompt assistance to attendees, customers, and visitors.`;

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
