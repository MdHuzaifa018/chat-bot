export interface DetectedTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  borderColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  fontHeading: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandName?: string;
  brandDescription?: string;
  language?: string;
  confidence: {
    primaryColor: number;
    fontFamily: number;
    logoUrl: number;
    brandName: number;
  };
  sources: {
    primaryColor: string;
    fontFamily: string;
    logoUrl: string;
    brandName: string;
  };
}

export class ThemeDetectorService {
  /**
   * Comprehensive extraction of brand colors, CSS variables, typography, logos, and JSON-LD metadata.
   */
  static extractTheme(html: string, baseUrl: URL): DetectedTheme {
    const sources = {
      primaryColor: "Default palette",
      fontFamily: "System default",
      logoUrl: "Favicon fallback",
      brandName: "Hostname fallback",
    };

    const confidence = {
      primaryColor: 0.5,
      fontFamily: 0.5,
      logoUrl: 0.5,
      brandName: 0.5,
    };

    // ------------------------------------------------------------------------
    // 1. Extract Language
    // ------------------------------------------------------------------------
    const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    const language = langMatch ? langMatch[1].trim().toLowerCase() : "en";

    // ------------------------------------------------------------------------
    // 2. Extract JSON-LD Structured Data
    // ------------------------------------------------------------------------
    let jsonLdName: string | undefined;
    let jsonLdLogo: string | undefined;
    let jsonLdDesc: string | undefined;

    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item["@type"] === "Organization" || item["@type"] === "WebSite" || item["@type"] === "Corporation") {
            if (item.name && typeof item.name === "string") jsonLdName = item.name.trim();
            if (item.logo) {
              if (typeof item.logo === "string") jsonLdLogo = item.logo.trim();
              else if (typeof item.logo === "object" && item.logo.url) jsonLdLogo = String(item.logo.url).trim();
            }
            if (item.description && typeof item.description === "string") jsonLdDesc = item.description.trim();
          }
        }
      } catch {
        // Ignore invalid JSON-LD blocks
      }
    }

    // ------------------------------------------------------------------------
    // 3. Extract Brand Name
    // ------------------------------------------------------------------------
    let brandName = jsonLdName;
    if (brandName) {
      sources.brandName = "JSON-LD Organization";
      confidence.brandName = 0.95;
    } else {
      const ogSiteName = html.match(/<meta[^>]*property=["'](?:og:site_name|twitter:title)["'][^>]*content=["']([^"']+)["']/i);
      if (ogSiteName && ogSiteName[1].trim()) {
        brandName = ogSiteName[1].trim();
        sources.brandName = "OpenGraph og:site_name";
        confidence.brandName = 0.9;
      } else {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          const cleanTitle = titleMatch[1].split(/[-–—|:]/)[0].trim();
          if (cleanTitle.length > 2 && cleanTitle.length < 35) {
            brandName = cleanTitle;
            sources.brandName = "HTML <title> tag";
            confidence.brandName = 0.8;
          }
        }
      }
    }
    if (!brandName) {
      brandName = baseUrl.hostname.replace(/^www\./, "");
      sources.brandName = "Domain fallback";
      confidence.brandName = 0.6;
    }

    // Brand description
    const metaDesc =
      jsonLdDesc ||
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim();

    // ------------------------------------------------------------------------
    // 4. Extract Logo and Favicon
    // ------------------------------------------------------------------------
    let logoUrl: string | undefined;
    let faviconUrl: string | undefined;

    // Check high-res favicon / touch icons
    const appleIcon = html.match(/<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i);
    const svgIcon = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*type=["']image\/svg\+xml["'][^>]*href=["']([^"']+)["']/i);
    const standardIcon =
      html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

    const rawFavicon = svgIcon?.[1] || appleIcon?.[1] || standardIcon?.[1];
    if (rawFavicon) {
      try {
        faviconUrl = new URL(rawFavicon, baseUrl.origin).href;
      } catch {
        // ignore
      }
    }
    if (!faviconUrl) {
      faviconUrl = `${baseUrl.origin}/favicon.ico`;
    }

    // Try finding dedicated logo
    if (jsonLdLogo) {
      try {
        logoUrl = new URL(jsonLdLogo, baseUrl.origin).href;
        sources.logoUrl = "JSON-LD schema logo";
        confidence.logoUrl = 0.95;
      } catch {
        // ignore
      }
    }

    if (!logoUrl) {
      // Look for <img> tags with "logo" in src, alt, or class inside header/nav
      const headerNavBlock = html.match(/<(?:header|nav)\b[^>]*>([\s\S]*?)<\/(?:header|nav)>/i)?.[1] || "";
      const logoImgMatch =
        headerNavBlock.match(/<img[^>]*src=["']([^"']+)["'][^>]*(?:alt|class|id)=["'][^"']*logo[^"']*["']/i) ||
        html.match(/<img[^>]*src=["']([^"']+)["'][^>]*(?:alt|class|id)=["'][^"']*logo[^"']*["']/i);

      if (logoImgMatch?.[1]) {
        try {
          logoUrl = new URL(logoImgMatch[1], baseUrl.origin).href;
          sources.logoUrl = "Header logo image";
          confidence.logoUrl = 0.9;
        } catch {
          // ignore
        }
      }
    }

    // Fallback logo to high-res icon or favicon
    if (!logoUrl) {
      logoUrl = appleIcon?.[1] ? new URL(appleIcon[1], baseUrl.origin).href : faviconUrl;
    }

    // ------------------------------------------------------------------------
    // 5. Extract Theme Colors (CSS Variables, Framework Tokens, Meta Tags)
    // ------------------------------------------------------------------------
    let primaryColor = "";
    let secondaryColor = "";
    let accentColor = "#A8C99B";
    let backgroundColor = "#FFFFFF";
    let cardBackgroundColor = "#F8FAFC";
    let textColor = "#0F172A";
    let borderColor = "#E2E8F0";

    // A. Check CSS Variables in <style> or :root
    const cssVariableMap = new Map<string, string>();
    const styleBlocks = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const sb of styleBlocks) {
      const css = sb[1];
      const varMatches = css.matchAll(/--([a-zA-Z0-9_\-]+)\s*:\s*([^;]+);/g);
      for (const vm of varMatches) {
        const key = vm[1].toLowerCase().trim();
        const rawVal = vm[2].trim();
        cssVariableMap.set(key, rawVal);
      }
    }

    // Helper to resolve CSS value to hex
    const resolveToHex = (val?: string): string | null => {
      if (!val) return null;
      val = val.trim();
      if (this.isValidHexColor(val)) return val.toUpperCase();
      // rgb(r, g, b)
      const rgbMatch = val.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (rgbMatch) {
        return this.rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
      }
      // hsl(h, s%, l%)
      const hslMatch = val.match(/hsla?\((\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/i);
      if (hslMatch) {
        return this.hslToHex(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]));
      }
      return null;
    };

    // Primary candidates from CSS variables
    const primaryVarCandidates = [
      "primary",
      "color-primary",
      "brand",
      "theme-primary",
      "main-color",
      "brand-color",
      "primary-500",
      "primary-600",
    ];
    for (const candidate of primaryVarCandidates) {
      const hex = resolveToHex(cssVariableMap.get(candidate));
      if (hex && !this.isNeutralColor(hex)) {
        primaryColor = hex;
        sources.primaryColor = `CSS variable (--${candidate})`;
        confidence.primaryColor = 0.95;
        break;
      }
    }

    // B. Check <meta name="theme-color">
    if (!primaryColor) {
      const metaThemeColor = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
      if (metaThemeColor && this.isValidHexColor(metaThemeColor[1].trim())) {
        const hex = metaThemeColor[1].trim().toUpperCase();
        if (!this.isNeutralColor(hex)) {
          primaryColor = hex;
          sources.primaryColor = "HTML <meta name='theme-color'>";
          confidence.primaryColor = 0.9;
        }
      }
    }

    // C. Scan for prominent UI button and navbar hex colors
    if (!primaryColor) {
      const hexMatches = Array.from(html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)).map((m) => m[0].toUpperCase());
      const vibrantColors = hexMatches
        .map((hex) => (hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex))
        .filter((hex) => !this.isNeutralColor(hex));

      if (vibrantColors.length > 0) {
        primaryColor = vibrantColors[0];
        sources.primaryColor = "Prominent website UI color";
        confidence.primaryColor = 0.75;
        if (vibrantColors.length > 1 && vibrantColors[1] !== primaryColor) {
          secondaryColor = vibrantColors[1];
        }
      }
    }

    // Fallback primary color
    if (!primaryColor) {
      primaryColor = "#254B35"; // Deep forest green
      sources.primaryColor = "SupportAI primary palette";
      confidence.primaryColor = 0.6;
    }
    if (!secondaryColor) {
      secondaryColor = "#3B82F6"; // Accent blue
    }

    // ------------------------------------------------------------------------
    // 6. Extract Typography
    // ------------------------------------------------------------------------
    let fontFamily = "";
    let fontHeading = "";

    // A. Check Google Fonts Link: fonts.googleapis.com/css2?family=Poppins:wght...
    const googleFontMatch = html.match(/fonts\.googleapis\.com\/css2\?[^"']*family=([a-zA-Z0-9+]+)/i);
    if (googleFontMatch?.[1]) {
      const fontName = decodeURIComponent(googleFontMatch[1].replace(/\+/g, " ")).split(":")[0].trim();
      fontFamily = `${fontName}, sans-serif`;
      fontHeading = `${fontName}, sans-serif`;
      sources.fontFamily = `Google Fonts (${fontName})`;
      confidence.fontFamily = 0.95;
    }

    // B. Check CSS Font Variables
    if (!fontFamily) {
      const fontVarCandidates = ["font-sans", "font-family", "font-primary", "font-heading"];
      for (const fc of fontVarCandidates) {
        const val = cssVariableMap.get(fc);
        if (val && val.length < 60) {
          const cleanFont = val.replace(/['"]/g, "").trim();
          fontFamily = cleanFont.includes("sans-serif") ? cleanFont : `${cleanFont}, sans-serif`;
          fontHeading = fontFamily;
          sources.fontFamily = `CSS variable (--${fc})`;
          confidence.fontFamily = 0.9;
          break;
        }
      }
    }

    // C. Inline font-family match
    if (!fontFamily) {
      const inlineFontMatch = html.match(/font-family:\s*["']?([a-zA-Z0-9\s,-]+)["']?[;}]/i);
      if (inlineFontMatch && inlineFontMatch[1].length < 40) {
        fontFamily = `${inlineFontMatch[1].trim()}`;
        fontHeading = fontFamily;
        sources.fontFamily = "Inline stylesheet";
        confidence.fontFamily = 0.75;
      }
    }

    if (!fontFamily) {
      fontFamily = "Inter, system-ui, -apple-system, sans-serif";
      fontHeading = "Inter, system-ui, -apple-system, sans-serif";
      sources.fontFamily = "System standard font";
      confidence.fontFamily = 0.6;
    }

    // Button text color calculation (dark on light, light on dark)
    const buttonTextColor = this.getContrastingTextColor(primaryColor);

    return {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      cardBackgroundColor,
      textColor,
      borderColor,
      buttonColor: primaryColor,
      buttonTextColor,
      fontFamily,
      fontHeading,
      logoUrl,
      faviconUrl,
      brandName,
      brandDescription: metaDesc,
      language,
      confidence,
      sources,
    };
  }

  private static isValidHexColor(hex: string): boolean {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
  }

  private static isNeutralColor(hex: string): boolean {
    const clean = hex.toUpperCase();
    const neutrals = [
      "#FFFFFF", "#000000", "#F8FAFC", "#F1F5F9", "#E2E8F0", "#CBD5E1",
      "#94A3B8", "#64748B", "#475569", "#334155", "#1E293B", "#0F172A",
      "#FAFAFA", "#F4F4F5", "#E4E4E7", "#D4D4D8", "#A1A1AA", "#71717A",
      "#52525B", "#3F3F46", "#27272A", "#18181B", "#111827", "#000", "#FFF"
    ];
    return neutrals.includes(clean);
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  private static hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }

  private static getContrastingTextColor(hex: string): string {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const r = parseInt(full.substring(0, 2), 16) || 0;
    const g = parseInt(full.substring(2, 4), 16) || 0;
    const b = parseInt(full.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#0F172A" : "#FFFFFF";
  }
}
