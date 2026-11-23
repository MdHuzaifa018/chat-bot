export interface DetectedTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor: string;
  cardBackgroundColor?: string;
  textColor: string;
  borderColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  fontFamily: string;
  fontHeading?: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandName?: string;
  confidence?: Record<string, number>;
  sources?: Record<string, string>;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export class ThemeDetectorService {
  /**
   * Analyzes raw HTML and external stylesheets to extract brand colors,
   * CSS variables, favicon/logo, fonts, and brand name.
   */
  static async extractTheme(html: string, baseUrl: URL): Promise<DetectedTheme> {
    // 1. Extract Brand Name
    const ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let brandName = ogSiteName ? ogSiteName[1].trim() : "";
    if (!brandName && titleMatch) {
      const cleanTitle = titleMatch[1].split(/[-–—|:]/)[0].trim();
      brandName = cleanTitle.length > 2 && cleanTitle.length < 30 ? cleanTitle : baseUrl.hostname;
    }
    if (!brandName) brandName = baseUrl.hostname;

    // 2. Extract Logo or Favicon
    let logoUrl: string | undefined;
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const appleIcon = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    const iconMatch =
      html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

    const rawIcon = appleIcon?.[1] || ogImage?.[1] || iconMatch?.[1];
    if (rawIcon) {
      try {
        logoUrl = new URL(rawIcon, baseUrl.origin).href;
      } catch {
        // invalid URL
      }
    }
    if (!logoUrl) {
      logoUrl = `${baseUrl.origin}/favicon.ico`;
    }

    // 3. Discover external stylesheet links: <link rel="stylesheet"> and <link rel="preload" as="style">
    const stylesheetUrls = this.discoverStylesheetUrls(html, baseUrl);

    // Fetch up to 3 external stylesheets in parallel (3s timeout each)
    const externalCssList = await this.fetchExternalStylesheets(stylesheetUrls.slice(0, 3));

    // Extract inline <style> blocks
    const inlineStyles = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)).map((m) => m[1]);

    // Combine all CSS for variable and color inspection
    const combinedCss = [...inlineStyles, ...externalCssList].join("\n");

    // 4. Extract CSS variables
    const cssVariables = this.extractCssVariables(combinedCss);

    // 5. Analyze Colors (Vibrant Primary/Secondary and Background)
    const { primaryColor, secondaryColor, backgroundColor, textColor } = this.analyzeColors(
      html,
      combinedCss,
      cssVariables
    );

    // 6. Extract Font Family
    const fontFamily = this.extractFontFamily(html, combinedCss, cssVariables);

    const accentColor = secondaryColor || "#A8C99B";
    const buttonColor = primaryColor;
    const buttonTextColor = "#FFFFFF";
    const borderColor = backgroundColor === "#FFFFFF" ? "#E2E8F0" : "#334155";
    const fontHeading = fontFamily;

    return {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      cardBackgroundColor: backgroundColor === "#FFFFFF" ? "#F8FAFC" : "#0B0C1E",
      textColor,
      borderColor,
      buttonColor,
      buttonTextColor,
      fontFamily,
      fontHeading,
      logoUrl,
      brandName,
      confidence: {
        primaryColor: 0.9,
        fontFamily: 0.85,
        logoUrl: 0.8,
        brandName: 0.9,
      },
      sources: {
        primaryColor: "Extracted website CSS color",
        fontFamily: "Extracted website font",
        logoUrl: "Website icon/logo",
        brandName: "Website meta/title",
      },
    };
  }

  /**
   * Discovers <link rel="stylesheet"> and <link rel="preload" as="style"> URLs
   */
  private static discoverStylesheetUrls(html: string, baseUrl: URL): string[] {
    const urls: string[] = [];
    const linkRegex = /<link\b([^>]+)>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const attrs = match[1];
      const isStylesheet = /rel=["'](?:[^"']*\s)?stylesheet(?:\s[^"']*)?["']/i.test(attrs);
      const isPreloadStyle =
        /rel=["'](?:[^"']*\s)?preload(?:\s[^"']*)?["']/i.test(attrs) && /as=["']style["']/i.test(attrs);

      if (isStylesheet || isPreloadStyle) {
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i) || attrs.match(/href=([^\s>]+)/i);
        if (hrefMatch && hrefMatch[1]) {
          const rawHref = hrefMatch[1].trim();
          if (!rawHref.startsWith("data:") && !rawHref.startsWith("javascript:")) {
            try {
              const resolved = new URL(rawHref, baseUrl.origin);
              if (["http:", "https:"].includes(resolved.protocol)) {
                if (!urls.includes(resolved.href)) {
                  urls.push(resolved.href);
                }
              }
            } catch {
              // ignore invalid url
            }
          }
        }
      }
    }

    return urls;
  }

  /**
   * Fetches external stylesheets in parallel with a 3-second timeout per sheet.
   */
  private static async fetchExternalStylesheets(urls: string[]): Promise<string[]> {
    if (urls.length === 0) return [];

    const fetchPromises = urls.map(async (url) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SupportAI-ThemeDetector/1.0",
            Accept: "text/css,*/*;q=0.1",
          },
          signal: controller.signal,
        });

        if (res.ok) {
          return await res.text();
        }
        return "";
      } catch {
        return "";
      } finally {
        clearTimeout(timeoutId);
      }
    });

    return await Promise.all(fetchPromises);
  }

  /**
   * Extracts CSS custom properties (--variable-name: value)
   */
  private static extractCssVariables(css: string): Map<string, string> {
    const vars = new Map<string, string>();
    const varRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;{}]+)/g;
    let match: RegExpExecArray | null;

    while ((match = varRegex.exec(css)) !== null) {
      const name = match[1].trim().toLowerCase();
      const value = match[2].trim();
      vars.set(name, value);
    }

    return vars;
  }

  /**
   * Frequency and vibrancy analysis for colors
   */
  private static analyzeColors(
    html: string,
    css: string,
    cssVariables: Map<string, string>
  ): {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  } {
    const scores = new Map<string, number>();

    const addScore = (hex: string, points: number) => {
      const normalized = this.normalizeHex(hex);
      if (normalized) {
        scores.set(normalized, (scores.get(normalized) || 0) + points);
      }
    };

    // 1. Meta theme-color (highest initial confidence)
    const metaThemeColor = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    let metaHex: string | null = null;
    if (metaThemeColor && this.isValidHexColor(metaThemeColor[1].trim())) {
      metaHex = this.normalizeHex(metaThemeColor[1].trim());
      if (metaHex) {
        addScore(metaHex, 20);
      }
    }

    // 2. CSS variables scoring
    for (const [varName, varValue] of cssVariables.entries()) {
      const hexMatches = varValue.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
      if (hexMatches) {
        for (const hex of hexMatches) {
          if (/primary|brand|main|theme/i.test(varName)) {
            addScore(hex, 25);
          } else if (/secondary|accent/i.test(varName)) {
            addScore(hex, 18);
          } else {
            addScore(hex, 5);
          }
        }
      }
    }

    // 3. Scan all hex colors in HTML and CSS
    const combinedSource = `${html} ${css}`;
    const allHexMatches = combinedSource.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
    for (const m of allHexMatches) {
      addScore(m[0], 1);
    }

    // 4. Background Color Detection (e.g. #070814 for Vibefest or dark mode)
    let detectedBg: string | null = null;

    // Check CSS variables for background
    for (const [varName, varValue] of cssVariables.entries()) {
      if (/^(background|bg|body-bg|color-bg|background-color)$/i.test(varName)) {
        const bgHex = varValue.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
        if (bgHex) {
          detectedBg = this.normalizeHex(bgHex[0]);
          break;
        }
      }
    }

    // Check body or html background rules in CSS
    if (!detectedBg) {
      const bodyBgMatch =
        css.match(/body\s*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})\b/i) ||
        css.match(/html\s*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})\b/i) ||
        css.match(/:root\s*\{[^}]*--background:\s*(#[0-9a-fA-F]{3,6})\b/i);
      if (bodyBgMatch && bodyBgMatch[1]) {
        detectedBg = this.normalizeHex(bodyBgMatch[1]);
      }
    }

    // Check Tailwind dark background utility classes like bg-[#070814] in HTML
    if (!detectedBg) {
      const twBgMatch = html.match(/bg-\[#(0-9a-fA-F]{3,6})\]/i);
      if (twBgMatch && twBgMatch[1]) {
        detectedBg = this.normalizeHex(`#${twBgMatch[1]}`);
      }
    }

    // Check frequency of background-declared hex colors (e.g. background: #070814)
    if (!detectedBg) {
      const bgHexCounts = new Map<string, number>();
      const bgMatches = combinedSource.matchAll(/(?:background|background-color|bg):\s*(#[0-9a-fA-F]{3,6})\b/gi);
      for (const m of bgMatches) {
        const norm = this.normalizeHex(m[1]);
        if (norm) {
          bgHexCounts.set(norm, (bgHexCounts.get(norm) || 0) + 1);
        }
      }
      if (bgHexCounts.size > 0) {
        const sortedBg = Array.from(bgHexCounts.entries()).sort((a, b) => b[1] - a[1]);
        detectedBg = sortedBg[0][0];
      }
    }

    // Resolve final background and text colors
    let backgroundColor = "#FFFFFF";
    let textColor = "#1E293B";

    if (detectedBg) {
      backgroundColor = detectedBg;
      const rgb = this.hexToRgb(detectedBg);
      if (rgb) {
        const brightness = (rgb.r + rgb.g + rgb.b) / 3;
        // If dark background (e.g. #070814 where brightness ~12)
        if (brightness < 128) {
          textColor = "#F8FAFC";
        } else {
          textColor = "#1E293B";
        }
      }
    }

    // 5. Filter vibrant non-neutral colors for primary & secondary branding
    const vibrantCandidates: Array<{ hex: string; score: number }> = [];

    for (const [hex, score] of scores.entries()) {
      // Avoid using the background color as the primary/secondary brand color
      if (detectedBg && hex === detectedBg) continue;

      const rgb = this.hexToRgb(hex);
      if (rgb && this.isVibrantNonNeutral(rgb)) {
        vibrantCandidates.push({ hex, score });
      }
    }

    // Sort by weighted score descending
    vibrantCandidates.sort((a, b) => b.score - a.score);

    // Pick top vibrant color as primary
    let primaryColor = "#0F172A"; // Default slate-900
    let secondaryColor = "#3B82F6"; // Default blue-500

    if (vibrantCandidates.length > 0) {
      primaryColor = vibrantCandidates[0].hex;

      // Find secondary color that is visually distinct from primary
      const primaryRgb = this.hexToRgb(primaryColor);
      for (let i = 1; i < vibrantCandidates.length; i++) {
        const candidate = vibrantCandidates[i];
        const candidateRgb = this.hexToRgb(candidate.hex);
        if (primaryRgb && candidateRgb && this.colorDistance(primaryRgb, candidateRgb) > 40) {
          secondaryColor = candidate.hex;
          break;
        }
      }

      // If no distinct secondary was found, check if metaHex or fallback differs
      if (secondaryColor === primaryColor || secondaryColor === "#3B82F6") {
        if (metaHex && metaHex !== primaryColor && metaHex !== detectedBg) {
          secondaryColor = metaHex;
        }
      }
    } else if (metaHex && metaHex !== detectedBg) {
      primaryColor = metaHex;
    }

    return {
      primaryColor,
      secondaryColor,
      backgroundColor,
      textColor,
    };
  }

  /**
   * Font Family Extraction
   */
  private static extractFontFamily(
    html: string,
    css: string,
    cssVariables: Map<string, string>
  ): string {
    // 1. Check CSS variables
    for (const [varName, varValue] of cssVariables.entries()) {
      if (/^(font-sans|font-family|font|font-body|font-main)$/i.test(varName)) {
        const cleaned = this.cleanFontFamily(varValue);
        if (cleaned) return cleaned;
      }
    }

    // 2. Check body or html rule in CSS
    const bodyFontMatch =
      css.match(/body\s*\{[^}]*font-family:\s*([^;{}]+)/i) ||
      css.match(/html\s*\{[^}]*font-family:\s*([^;{}]+)/i) ||
      css.match(/:root\s*\{[^}]*font-family:\s*([^;{}]+)/i);

    if (bodyFontMatch && bodyFontMatch[1]) {
      const cleaned = this.cleanFontFamily(bodyFontMatch[1]);
      if (cleaned) return cleaned;
    }

    // 3. Check Google Fonts links
    const gfontMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([a-zA-Z0-9+]+)/i);
    if (gfontMatch && gfontMatch[1]) {
      const fontName = decodeURIComponent(gfontMatch[1].replace(/\+/g, " ").split(":")[0]);
      if (fontName.length > 2 && fontName.length < 40) {
        return `${fontName}, system-ui, sans-serif`;
      }
    }

    // 4. General font-family match in HTML / CSS
    const generalMatch = html.match(/font-family:\s*["']?([a-zA-Z0-9\s,-]+)["']?[;}]/i);
    if (generalMatch && generalMatch[1]) {
      const cleaned = this.cleanFontFamily(generalMatch[1]);
      if (cleaned) return cleaned;
    }

    return "Inter, system-ui, sans-serif";
  }

  private static cleanFontFamily(raw: string): string | null {
    let cleaned = raw
      .replace(/!important/gi, "")
      .replace(/["']/g, "")
      .trim();

    if (cleaned.startsWith("var(") && cleaned.endsWith(")")) {
      return null;
    }

    if (cleaned.length < 2 || cleaned.length > 60) {
      return null;
    }

    if (!cleaned.includes("sans-serif") && !cleaned.includes("serif") && !cleaned.includes("monospace")) {
      cleaned = `${cleaned}, system-ui, sans-serif`;
    }

    return cleaned;
  }

  /**
   * Identifies vibrant, non-neutral colors (e.g. #a855f7, #4f46e5)
   * Excludes pure whites, dark blacks, and washed out neutrals / grays.
   */
  private static isVibrantNonNeutral(rgb: RgbColor): boolean {
    const { r, g, b } = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const brightness = (r + g + b) / 3;
    const saturation = max === 0 ? 0 : delta / max;

    // Minimum chroma delta and saturation to exclude neutral slates/grays
    return delta >= 32 && saturation >= 0.28 && brightness >= 30 && brightness <= 235;
  }

  /**
   * Calculates Euclidean RGB distance between two colors
   */
  private static colorDistance(c1: RgbColor, c2: RgbColor): number {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
    );
  }

  private static hexToRgb(hex: string): RgbColor | null {
    const clean = hex.startsWith("#") ? hex.slice(1) : hex;
    if (clean.length === 3) {
      return {
        r: parseInt(clean[0] + clean[0], 16),
        g: parseInt(clean[1] + clean[1], 16),
        b: parseInt(clean[2] + clean[2], 16),
      };
    }
    if (clean.length === 6) {
      return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
      };
    }
    return null;
  }

  private static normalizeHex(hex: string): string | null {
    const clean = hex.trim().replace(/^#/, "");
    if (clean.length === 3 && /^[0-9a-fA-F]{3}$/.test(clean)) {
      return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toUpperCase();
    }
    if (clean.length === 6 && /^[0-9a-fA-F]{6}$/.test(clean)) {
      return `#${clean}`.toUpperCase();
    }
    return null;
  }

  private static isValidHexColor(hex: string): boolean {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
  }
}
