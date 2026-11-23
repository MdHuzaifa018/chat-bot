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
  suggestedColors?: string[];
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

    // 5. Analyze Colors (Vibrant Primary/Secondary, Background & Full Palette)
    const { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, suggestedColors } = this.analyzeColors(
      html,
      combinedCss,
      cssVariables
    );

    // 6. Extract Font Family
    const fontFamily = this.extractFontFamily(html, combinedCss, cssVariables);

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
      suggestedColors,
      confidence: {
        primaryColor: 0.95,
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
   * Fetches external stylesheets in parallel with a 1.5-second timeout per sheet.
   */
  private static async fetchExternalStylesheets(urls: string[]): Promise<string[]> {
    if (urls.length === 0) return [];

    const fetchPromises = urls.map(async (url) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
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
   * Converts any RGB, RGBA, HSL, or raw RGB string into normalized Hex #RRGGBB.
   */
  private static parseColorToHex(raw: string): string | null {
    if (!raw) return null;
    const clean = raw.trim();

    // 1. Direct hex
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean)) {
      return this.normalizeHex(clean);
    }

    // 2. rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = clean.match(/rgba?\s*\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
    if (rgbMatch) {
      const r = Math.min(255, parseInt(rgbMatch[1], 10));
      const g = Math.min(255, parseInt(rgbMatch[2], 10));
      const b = Math.min(255, parseInt(rgbMatch[3], 10));
      return this.rgbToHex(r, g, b);
    }

    // 3. Space-separated RGB numbers: e.g. "37 99 235" (common in Tailwind / shadcn)
    const spaceRgb = clean.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/);
    if (spaceRgb) {
      const r = Math.min(255, parseInt(spaceRgb[1], 10));
      const g = Math.min(255, parseInt(spaceRgb[2], 10));
      const b = Math.min(255, parseInt(spaceRgb[3], 10));
      return this.rgbToHex(r, g, b);
    }

    // 4. hsl(h, s%, l%)
    const hslMatch = clean.match(/hsla?\s*\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%?\s*[, ]\s*([\d.]+)%?/i);
    if (hslMatch) {
      const h = parseFloat(hslMatch[1]);
      const s = parseFloat(hslMatch[2]) / 100;
      const l = parseFloat(hslMatch[3]) / 100;
      const rgb = this.hslToRgb(h, s, l);
      return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    return null;
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }

  private static hslToRgb(h: number, s: number, l: number): RgbColor {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  /**
   * Tailwind standard palette map for utility class detection
   */
  private static readonly TAILWIND_COLORS: Record<string, string> = {
    "emerald-600": "#059669",
    "emerald-500": "#10B981",
    "emerald-700": "#047857",
    "green-600": "#16A34A",
    "green-500": "#22C55E",
    "teal-600": "#0D9488",
    "teal-500": "#14B8A6",
    "cyan-600": "#0891B2",
    "sky-600": "#0284C7",
    "blue-600": "#2563EB",
    "blue-500": "#3B82F6",
    "blue-700": "#1D4ED8",
    "indigo-600": "#4F46E5",
    "indigo-500": "#6366F1",
    "violet-600": "#7C3AED",
    "purple-600": "#9333EA",
    "purple-500": "#A855F7",
    "fuchsia-600": "#C026D3",
    "pink-600": "#DB2777",
    "rose-600": "#E11D48",
    "orange-500": "#F97316",
    "amber-500": "#F59E0B",
  };

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
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    suggestedColors: string[];
  } {
    const scores = new Map<string, number>();

    const addScore = (colorVal: string | null | undefined, points: number) => {
      if (!colorVal) return;
      const hex = this.parseColorToHex(colorVal);
      if (hex) {
        scores.set(hex, (scores.get(hex) || 0) + points);
      }
    };

    // 1. Meta theme-color & msapplication-TileColor (highest brand confidence)
    const metaThemeColor = html.match(/<meta[^>]*name=["'](?:theme-color|msapplication-TileColor|msapplication-navbutton-color)["'][^>]*content=["']([^"']+)["']/i);
    let metaHex: string | null = null;
    if (metaThemeColor && metaThemeColor[1]) {
      metaHex = this.parseColorToHex(metaThemeColor[1].trim());
      if (metaHex) {
        addScore(metaHex, 35);
      }
    }

    // 2. CSS variables scoring (supports hex, rgb, hsl, space-separated channels)
    for (const [varName, varValue] of cssVariables.entries()) {
      const parsedHex = this.parseColorToHex(varValue);
      if (parsedHex) {
        if (/primary|brand|main|theme/i.test(varName)) {
          addScore(parsedHex, 30);
        } else if (/secondary|accent/i.test(varName)) {
          addScore(parsedHex, 22);
        } else if (/button|cta|action/i.test(varName)) {
          addScore(parsedHex, 20);
        } else {
          addScore(parsedHex, 6);
        }
      }

      // Also search for any embedded hex strings within the CSS variable value
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

    // 4. Scan SVG fill and stroke colors
    const svgFills = combinedSource.matchAll(/(?:fill|stroke)=["'](#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|hsla?\([^)]+\))["']/gi);
    for (const m of svgFills) {
      addScore(m[1], 4);
    }

    // 5. Scan Tailwind utility classes (e.g. bg-blue-600, text-emerald-500)
    for (const [cls, hex] of Object.entries(this.TAILWIND_COLORS)) {
      if (html.includes(cls)) {
        addScore(hex, 12);
      }
    }

    // 6. Background Color Detection (e.g. #070814 for dark themes, or #FFFFFF / #F8FAFC)
    let detectedBg: string | null = null;

    // Check CSS variables for background
    for (const [varName, varValue] of cssVariables.entries()) {
      if (/^(background|bg|body-bg|color-bg|background-color)$/i.test(varName)) {
        const bg = this.parseColorToHex(varValue);
        if (bg) {
          detectedBg = bg;
          break;
        }
      }
    }

    // Check body or html background rules in CSS
    if (!detectedBg) {
      const bodyBgMatch =
        css.match(/body\s*\{[^}]*background(?:-color)?:\s*([#a-zA-Z0-9(),\s-]+)[;}!]/i) ||
        css.match(/html\s*\{[^}]*background(?:-color)?:\s*([#a-zA-Z0-9(),\s-]+)[;}!]/i) ||
        css.match(/:root\s*\{[^}]*--background:\s*([#a-zA-Z0-9(),\s-]+)[;}!]/i);
      if (bodyBgMatch && bodyBgMatch[1]) {
        detectedBg = this.parseColorToHex(bodyBgMatch[1]);
      }
    }

    // Check Tailwind dark background utility classes like bg-[#070814] in HTML
    if (!detectedBg) {
      const twBgMatch = html.match(/bg-\[#(0-9a-fA-F]{3,6})\]/i);
      if (twBgMatch && twBgMatch[1]) {
        detectedBg = this.normalizeHex(`#${twBgMatch[1]}`);
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
        if (brightness < 128) {
          textColor = "#F8FAFC"; // Dark mode contrast
        } else {
          textColor = "#1E293B"; // Light mode contrast
        }
      }
    }

    // 7. Filter vibrant non-neutral colors for primary & secondary branding
    const vibrantCandidates: Array<{ hex: string; score: number }> = [];

    for (const [hex, score] of scores.entries()) {
      // Exclude background color from brand primary
      if (detectedBg && hex === detectedBg) continue;

      const rgb = this.hexToRgb(hex);
      if (rgb && this.isVibrantNonNeutral(rgb)) {
        vibrantCandidates.push({ hex, score });
      }
    }

    // Sort by weighted score descending
    vibrantCandidates.sort((a, b) => b.score - a.score);

    // Pick top vibrant colors
    let primaryColor = "#254B35"; // Default brand green
    let secondaryColor = "#3B82F6"; // Default blue
    let accentColor = "#A855F7"; // Default purple

    if (vibrantCandidates.length > 0) {
      primaryColor = vibrantCandidates[0].hex;

      // Find secondary color distinct from primary
      const primaryRgb = this.hexToRgb(primaryColor);
      for (let i = 1; i < vibrantCandidates.length; i++) {
        const cand = vibrantCandidates[i];
        const candRgb = this.hexToRgb(cand.hex);
        if (primaryRgb && candRgb && this.colorDistance(primaryRgb, candRgb) > 40) {
          secondaryColor = cand.hex;
          break;
        }
      }

      // Find accent color distinct from primary and secondary
      const secRgb = this.hexToRgb(secondaryColor);
      for (let i = 1; i < vibrantCandidates.length; i++) {
        const cand = vibrantCandidates[i];
        if (cand.hex !== primaryColor && cand.hex !== secondaryColor) {
          const candRgb = this.hexToRgb(cand.hex);
          if (candRgb && primaryRgb && this.colorDistance(primaryRgb, candRgb) > 30) {
            accentColor = cand.hex;
            break;
          }
        }
      }

      if (metaHex && metaHex !== primaryColor && metaHex !== detectedBg) {
        if (secondaryColor === "#3B82F6") secondaryColor = metaHex;
      }
    } else if (metaHex && metaHex !== detectedBg) {
      primaryColor = metaHex;
    }

    // Build curated palette of suggested colors (up to 8 vibrant options)
    const suggestedColorsSet = new Set<string>();
    if (primaryColor) suggestedColorsSet.add(primaryColor);
    if (secondaryColor) suggestedColorsSet.add(secondaryColor);
    if (accentColor) suggestedColorsSet.add(accentColor);
    for (const v of vibrantCandidates) {
      if (suggestedColorsSet.size >= 8) break;
      suggestedColorsSet.add(v.hex);
    }
    // Fallback vibrant accents if needed
    ["#254B35", "#3B82F6", "#A855F7", "#EC4899", "#10B981"].forEach((c) => {
      if (suggestedColorsSet.size < 5) suggestedColorsSet.add(c);
    });

    return {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      suggestedColors: Array.from(suggestedColorsSet),
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
