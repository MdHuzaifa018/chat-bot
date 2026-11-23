import { ApiError } from "../utils/apiError.js";
import { supabaseRequest } from "../utils/supabase.js";
import { createHash } from "node:crypto";
import type { CrawledPage, KnowledgeDocument } from "../types/index.js";

export interface CrawlResult {
  url: string;
  path: string;
  title: string;
  description: string;
  cleanText: string;
  pageType: string;
}

export class CrawlerService {
  /**
   * SSRF Protection: Ensure target URL is a safe, publicly routable HTTP/HTTPS address.
   */
  static validateSafeUrl(rawUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
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
      /^169\.254\.\d+\.\d+$/, // Link-local & cloud metadata (AWS, GCP, Azure)
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
    ];

    if (forbiddenPatterns.some((pattern) => pattern.test(host))) {
      throw new ApiError(400, "FORBIDDEN_HOST", "Internal and private network addresses cannot be crawled.");
    }

    return parsed;
  }

  /**
   * Fetch an HTML page or text resource with timeout and standard browser headers
   */
  static async fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SupportAI-Crawler/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiError(502, "FETCH_FAILED", `Failed to reach ${url}: ${msg}`);
    }
  }

  /**
   * Automatically discover sitemap XML URLs from robots.txt or standard paths
   */
  static async discoverSitemapUrls(baseUrl: URL): Promise<string[]> {
    const discoveredUrls = new Set<string>();

    // 1. Check robots.txt for Sitemap: directives
    try {
      const robotsUrl = `${baseUrl.origin}/robots.txt`;
      const robotsTxt = await this.fetchHtml(robotsUrl, 4000);
      const sitemapMatches = robotsTxt.matchAll(/Sitemap:\s*([^\r\n]+)/gi);
      for (const sm of sitemapMatches) {
        const sitemapUrl = sm[1].trim();
        if (sitemapUrl.startsWith("http")) {
          await this.parseSitemapXml(sitemapUrl, baseUrl, discoveredUrls);
        }
      }
    } catch {
      // Continue if robots.txt is unavailable
    }

    // 2. Check standard /sitemap.xml if none found yet
    if (discoveredUrls.size === 0) {
      const candidatePaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-pages.xml"];
      for (const p of candidatePaths) {
        try {
          const smUrl = `${baseUrl.origin}${p}`;
          await this.parseSitemapXml(smUrl, baseUrl, discoveredUrls);
          if (discoveredUrls.size > 0) break;
        } catch {
          // ignore
        }
      }
    }

    return Array.from(discoveredUrls);
  }

  private static async parseSitemapXml(sitemapUrl: string, baseUrl: URL, results: Set<string>): Promise<void> {
    try {
      const xml = await this.fetchHtml(sitemapUrl, 5000);
      const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);
      for (const lm of locMatches) {
        const loc = lm[1].trim();
        try {
          const parsed = new URL(loc);
          if (parsed.hostname === baseUrl.hostname && ["http:", "https:"].includes(parsed.protocol)) {
            // Filter out images/assets
            if (!loc.match(/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js|woff2?|ico|xml)$/i)) {
              results.add(loc);
              if (results.size >= 40) return;
            }
          }
        } catch {
          // ignore invalid loc
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Categorize page type by URL pathname for prioritized crawling
   */
  static categorizePage(pathname: string): { type: string; priority: number } {
    const lower = pathname.toLowerCase();
    if (lower === "/" || lower === "") return { type: "homepage", priority: 10 };
    if (lower.includes("about") || lower.includes("company") || lower.includes("story")) return { type: "about", priority: 9 };
    if (lower.includes("pricing") || lower.includes("plan") || lower.includes("subscription")) return { type: "pricing", priority: 9 };
    if (lower.includes("faq") || lower.includes("help") || lower.includes("support")) return { type: "faq", priority: 9 };
    if (lower.includes("service") || lower.includes("feature") || lower.includes("product")) return { type: "service", priority: 8 };
    if (lower.includes("contact") || lower.includes("reach")) return { type: "contact", priority: 8 };
    if (lower.includes("refund") || lower.includes("policy") || lower.includes("terms") || lower.includes("privacy")) return { type: "policy", priority: 7 };
    if (lower.includes("booking") || lower.includes("seat") || lower.includes("event")) return { type: "event_booking", priority: 8 };
    return { type: "general", priority: 5 };
  }

  /**
   * Clean HTML to extract title, description, and structured readable text preserving headings & tables
   */
  static extractPageData(html: string, pageUrl: string): CrawlResult {
    const parsed = new URL(pageUrl);
    const { type: pageType } = this.categorizePage(parsed.pathname);

    // 1. Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;

    // 2. Meta description
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // 3. Remove non-content blocks: scripts, styles, svgs, header, nav, footer, noscript
    let working = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");

    // 4. Format headings & list items before stripping tags
    working = working
      .replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, "\n\n### $1\n")
      .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, "\n\n#### $1\n")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n• $1")
      .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, "$1\n")
      .replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, " | $1 ");

    // 5. Strip all HTML tags
    working = working.replace(/<[^>]+>/g, " ");

    // 6. Decode entities
    working = working
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");

    // 7. Normalize whitespace
    const cleanText = working.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 30000);

    return {
      url: pageUrl,
      path: parsed.pathname || "/",
      title,
      description,
      cleanText,
      pageType,
    };
  }

  /**
   * Break large page content into semantic overlapping chunks (approx 600-800 characters)
   */
  static semanticChunkText(content: string, maxChunkSize = 750, overlap = 100): string[] {
    const clean = content.trim();
    if (clean.length <= maxChunkSize) {
      return [clean];
    }

    const chunks: string[] = [];
    const paragraphs = clean.split(/\n\s*\n/);
    let currentChunk = "";

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (currentChunk.length + trimmedPara.length <= maxChunkSize) {
        currentChunk += (currentChunk ? "\n\n" : "") + trimmedPara;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          // Retain overlap from end of currentChunk
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + "\n\n" + trimmedPara;
        } else {
          // Paragraph itself is larger than maxChunkSize; break by sentence
          const sentences = trimmedPara.match(/[^.!?]+[.!?]+/g) || [trimmedPara];
          for (const s of sentences) {
            if (currentChunk.length + s.length <= maxChunkSize) {
              currentChunk += (currentChunk ? " " : "") + s.trim();
            } else {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = s.trim();
            }
          }
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * SPA Deep Extraction: For client-side single-page applications (React, Next.js, Vite)
   */
  static async extractSpaContent(html: string, baseUrl: URL): Promise<{ text: string; routes: string[] }> {
    const scriptMatches = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gi));
    let bundleText = "";
    const routes = new Set<string>();

    for (const match of scriptMatches) {
      const src = match[1];
      if (
        src.includes("turnstile") ||
        src.includes("analytics") ||
        src.includes("clarity") ||
        src.includes("gtag") ||
        src.includes("polyfill")
      ) {
        continue;
      }

      try {
        const scriptUrl = new URL(src, baseUrl.origin);
        if (scriptUrl.hostname === baseUrl.hostname) {
          const js = await this.fetchHtml(scriptUrl.href, 8000);

          // Extract routes
          const pathMatches = js.matchAll(/(?:path|to|href):\s*["'](\/[a-zA-Z0-9_\-\/]{2,35})["']/g);
          for (const pm of pathMatches) {
            routes.add(pm[1]);
          }

          // Extract readable business strings
          const stringMatches = js.matchAll(/["']([A-Z][A-Za-z0-9 ,.?!:;'\-\(\)]{14,140})["']/g);
          const collectedStrings = new Set<string>();
          for (const sm of stringMatches) {
            const str = sm[1].trim();
            if (
              !str.includes("function") &&
              !str.includes("return") &&
              !str.includes("webpack") &&
              !str.includes("styled") &&
              !str.startsWith("text-") &&
              !str.startsWith("bg-") &&
              !str.startsWith("M")
            ) {
              collectedStrings.add(str);
            }
          }

          if (collectedStrings.size > 0) {
            bundleText += "\n" + Array.from(collectedStrings).slice(0, 60).join(". ") + ".";
          }
        }
      } catch {
        // continue
      }
    }

    return { text: bundleText, routes: Array.from(routes) };
  }

  /**
   * Extract internal same-origin links
   */
  static extractInternalLinks(html: string, baseUrl: URL, maxLinks = 20): string[] {
    const linkMatches = html.matchAll(/href=["']([^"']+)["']/gi);
    const discovered = new Set<string>();

    for (const match of linkMatches) {
      const href = match[1].trim();
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        continue;
      }

      try {
        const resolved = new URL(href, baseUrl.origin);
        if (resolved.hostname === baseUrl.hostname && ["http:", "https:"].includes(resolved.protocol)) {
          const cleanLink = `${resolved.origin}${resolved.pathname.replace(/\/$/, "")}`;
          if (!cleanLink.match(/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js|woff2?|ico|xml)$/i)) {
            discovered.add(cleanLink || resolved.origin);
          }
        }
      } catch {
        // ignore
      }

      if (discovered.size >= maxLinks) break;
    }

    return Array.from(discovered);
  }

  /**
   * Crawl a website: sitemap discovery + prioritization + semantic chunking
   */
  static async crawlWebsite(
    websiteId: string,
    targetUrl: string,
    maxPages = 8
  ): Promise<CrawlResult[]> {
    const rootUrl = this.validateSafeUrl(targetUrl);
    const visited = new Set<string>();
    const results: CrawlResult[] = [];

    // 1. Discover sitemap URLs
    const sitemapUrls = await this.discoverSitemapUrls(rootUrl);

    // 2. Build prioritized initial queue
    const queue: string[] = [rootUrl.href];
    if (sitemapUrls.length > 0) {
      // Sort sitemap URLs by priority
      const sortedSitemap = sitemapUrls.sort((a, b) => {
        const prioA = this.categorizePage(new URL(a).pathname).priority;
        const prioB = this.categorizePage(new URL(b).pathname).priority;
        return prioB - prioA;
      });
      for (const smUrl of sortedSitemap) {
        if (!queue.includes(smUrl)) queue.push(smUrl);
      }
    }

    while (queue.length > 0 && results.length < maxPages) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const html = await this.fetchHtml(currentUrl);
        const pageData = this.extractPageData(html, currentUrl);

        // SPA Deep Extraction fallback if text is sparse (< 300 chars)
        if (pageData.cleanText.length < 300) {
          try {
            const spaData = await this.extractSpaContent(html, rootUrl);
            if (spaData.text) {
              pageData.cleanText += "\n\n[Application Overview & Event Content]:\n" + spaData.text;
            }
            for (const r of spaData.routes) {
              const routeUrl = `${rootUrl.origin}${r}`;
              if (!visited.has(routeUrl) && !queue.includes(routeUrl)) {
                queue.push(routeUrl);
              }
            }
          } catch {
            // continue
          }
        }

        if (pageData.cleanText.length > 25) {
          results.push(pageData);

          const contentHash = createHash("sha256").update(pageData.cleanText).digest("hex");

          // 1. Save page to Supabase crawled_pages with resilient column fallback
          try {
            try {
              await supabaseRequest<CrawledPage>("crawled_pages", {
                method: "POST",
                prefer: "resolution=merge-duplicates",
                body: {
                  website_id: websiteId,
                  url: pageData.url,
                  path: pageData.path,
                  title: pageData.title,
                  description: pageData.description,
                  clean_text: pageData.cleanText,
                  page_type: pageData.pageType,
                  status: "crawled",
                  content_hash: contentHash,
                },
              });
            } catch {
              // Fallback to core columns
              await supabaseRequest<CrawledPage>("crawled_pages", {
                method: "POST",
                prefer: "resolution=merge-duplicates",
                body: {
                  website_id: websiteId,
                  url: pageData.url,
                  path: pageData.path,
                  title: pageData.title,
                  description: pageData.description,
                  clean_text: pageData.cleanText,
                  status: "crawled",
                },
              });
            }

            // 2. Semantic Chunking: Store manageable 750-char chunks for accurate RAG retrieval
            const chunks = this.semanticChunkText(pageData.cleanText);

            for (let i = 0; i < chunks.length; i++) {
              const chunkSlug = `${websiteId}-${createHash("sha256").update(`${pageData.url}-${i}`).digest("hex").slice(0, 24)}`;
              try {
                // Try extended schema
                await supabaseRequest<KnowledgeDocument[]>("knowledge_documents?on_conflict=slug", {
                  method: "POST",
                  prefer: "resolution=merge-duplicates,return=representation",
                  body: {
                    website_id: websiteId,
                    title: `${pageData.title} (Part ${i + 1})`,
                    slug: chunkSlug,
                    category: pageData.pageType || "website",
                    chunk_index: i,
                    is_published: true,
                    source_type: "crawled_page",
                    source_url: pageData.url,
                    content: chunks[i],
                    metadata: {
                      url: pageData.url,
                      title: pageData.title,
                      chunkIndex: i,
                      totalChunks: chunks.length,
                    },
                  },
                });
              } catch {
                // Fallback to core columns supported by Supabase schema
                try {
                  await supabaseRequest<KnowledgeDocument[]>("knowledge_documents", {
                    method: "POST",
                    body: {
                      website_id: websiteId,
                      title: `${pageData.title} (Part ${i + 1})`,
                      source_type: "crawled_page",
                      source_url: pageData.url,
                      content: chunks[i],
                    },
                  });
                } catch (fallbackErr) {
                  console.warn(`[Crawler] Failed to persist knowledge chunk ${i}:`, fallbackErr);
                }
              }
            }
          } catch (dbErr) {
            console.error(`[Crawler] Failed to persist page ${currentUrl}:`, dbErr);
          }

          // Discover additional links if queue has room
          if (results.length < maxPages) {
            const internalLinks = this.extractInternalLinks(html, rootUrl, maxPages * 2);
            for (const link of internalLinks) {
              if (!visited.has(link) && !queue.includes(link)) {
                queue.push(link);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[Crawler] Skipping ${currentUrl}:`, err);
      }
    }

    return results;
  }
}
