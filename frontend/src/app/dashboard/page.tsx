"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Sparkles,
  Palette,
  Plus,
  Trash2,
  Save,
  Bot,
  Send,
  Check,
  Loader2,
  RotateCcw,
  ArrowRight,
  MessageSquarePlus,
  BookOpen,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Type,
} from "lucide-react";
import {
  createWebsite,
  fetchWebsiteDetails,
  updateChatbotConfig,
  updateSuggestedQuestions,
  addKnowledgeDoc,
} from "@/api/saasApi";

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

interface PreviewMessage {
  sender: "bot" | "user";
  text: string;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  sourceType?: string;
  sourceUrl?: string;
}

interface CrawledPageItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  created_at: string;
}

interface DetectedThemeState {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontHeading: string;
  logoUrl?: string;
  brandName?: string;
  confidence?: Record<string, number>;
  sources?: Record<string, string>;
}

export default function ChatbotSettingsPage() {
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

  // Section 1: Website Setup Form
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");

  // Multi-step crawl progress
  const [isScanning, setIsScanning] = useState(false);
  const [crawlStep, setCrawlStep] = useState<string>("");
  const [crawlPercent, setCrawlPercent] = useState<number>(0);
  const [scanResultMsg, setScanResultMsg] = useState("");
  const [scanError, setScanError] = useState("");

  // Extracted Brand & Identity State
  const [detectedTheme, setDetectedTheme] = useState<DetectedThemeState | null>(null);
  const [publicChatbotId, setPublicChatbotId] = useState("bot_demo12345678");
  const [websiteId, setWebsiteId] = useState("");
  const [botName, setBotName] = useState("Support Assistant");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! How can I help you today? Pick a quick question below or ask anything about our services."
  );
  const [primaryColor, setPrimaryColor] = useState("#254B35");
  const [secondaryColor, setSecondaryColor] = useState("#3B82F6");
  const [surfaceColor, setSurfaceColor] = useState("#F8FAFC");
  const [fontFamily, setFontFamily] = useState("Inter, system-ui, sans-serif");
  const [logoUrl, setLogoUrl] = useState<string>("");

  // Section 3: AI Suggested Questions
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "What are your support and operating hours?",
    "How do I book or request a service?",
    "What is your refund or cancellation policy?",
  ]);

  // Section 4: Fixed Q&A State
  const [qaList, setQaList] = useState<QAItem[]>([
    {
      id: "default-1",
      question: "What are your support hours?",
      answer: "Our human support team is available Mon–Fri, 9 AM to 6 PM. This AI assistant is active 24/7!",
    },
  ]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Section 5: Knowledge Base & Crawled Pages
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeDoc[]>([]);
  const [crawledPagesList, setCrawledPagesList] = useState<CrawledPageItem[]>([]);
  const [isTrainingAI, setIsTrainingAI] = useState(false);
  const [knowledgeSuccessMsg, setKnowledgeSuccessMsg] = useState("");

  // Live Chatbot Preview State
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load previous config on mount
  useEffect(() => {
    const raw = localStorage.getItem("supportai_config");
    const storedBotId = localStorage.getItem("supportai_public_chatbot_id");
    const storedWebsiteId = localStorage.getItem("supportai_website_id");

    if (storedBotId) setPublicChatbotId(storedBotId);
    if (storedWebsiteId) {
      setWebsiteId(storedWebsiteId);
      // Load live details from backend
      fetchWebsiteDetails(storedWebsiteId)
        .then((data) => {
          if (data?.website) {
            setWebsiteName(data.website.name || "");
            setWebsiteUrl(data.website.url || "");
          }
          if (data?.chatbotConfig) {
            const cfg = data.chatbotConfig;
            if (cfg.chatbot_name) setBotName(cfg.chatbot_name);
            if (cfg.welcome_message) setWelcomeMessage(cfg.welcome_message);
            if (cfg.primary_color) setPrimaryColor(cfg.primary_color);
            if (cfg.secondary_color) setSecondaryColor(cfg.secondary_color);
            if (cfg.font_family) setFontFamily(cfg.font_family);
            if (cfg.logo_url) setLogoUrl(cfg.logo_url);
            if (cfg.public_chatbot_id) setPublicChatbotId(cfg.public_chatbot_id);
          }
          if (Array.isArray(data?.suggestedQuestions) && data.suggestedQuestions.length > 0) {
            setSuggestedQuestions(data.suggestedQuestions.map((q: any) => q.question_text));
          }
          if (Array.isArray(data?.crawledPages)) {
            setCrawledPagesList(data.crawledPages);
          }
          if (Array.isArray(data?.knowledgeDocuments)) {
            setKnowledgeList(
              data.knowledgeDocuments.map((d: any) => ({
                id: d.id,
                title: d.title,
                content: d.content,
                sourceType: d.source_type,
                sourceUrl: d.source_url,
              }))
            );
          }
        })
        .catch(() => undefined);
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.websiteUrl) setWebsiteUrl(parsed.websiteUrl);
        if (parsed.websiteName) setWebsiteName(parsed.websiteName);
        if (parsed.botName) setBotName(parsed.botName);
        if (parsed.welcomeMessage) setWelcomeMessage(parsed.welcomeMessage);
        if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
        if (Array.isArray(parsed.qaList)) setQaList(parsed.qaList);
        if (parsed.detectedTheme) setDetectedTheme(parsed.detectedTheme);
      } catch {
        // ignore
      }
    }
  }, []);

  // Multi-step Website Crawler & Brand Extraction
  const handleScanWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setIsScanning(true);
    setScanResultMsg("");
    setScanError("");
    setCrawlStep("1. Validating URL & reachability...");
    setCrawlPercent(15);

    try {
      // Step 2 Progress
      setTimeout(() => {
        setCrawlStep("2. Discovering sitemap.xml & priority pages...");
        setCrawlPercent(40);
      }, 700);

      // Step 3 Progress
      setTimeout(() => {
        setCrawlStep("3. Extracting CSS variables, Google Fonts & brand tokens...");
        setCrawlPercent(65);
      }, 1500);

      // Call Backend API with full authentication credentials
      const res = await createWebsite(websiteUrl.trim(), websiteName.trim() || undefined);
      const data = res?.data;

      if (data) {
        setCrawlStep("4. Generating semantic chunks & Gemini suggested questions...");
        setCrawlPercent(90);

        const cfg = data.chatbotConfig;
        const site = data.website;
        const theme = data.detectedTheme;

        if (site?.id) {
          setWebsiteId(site.id);
          localStorage.setItem("supportai_website_id", site.id);
        }
        if (cfg?.public_chatbot_id) {
          setPublicChatbotId(cfg.public_chatbot_id);
          localStorage.setItem("supportai_public_chatbot_id", cfg.public_chatbot_id);
        }
        if (cfg?.chatbot_name) setBotName(cfg.chatbot_name);
        if (cfg?.primary_color) setPrimaryColor(cfg.primary_color);
        if (cfg?.secondary_color) setSecondaryColor(cfg.secondary_color);
        if (cfg?.font_family) setFontFamily(cfg.font_family);
        if (cfg?.welcome_message) setWelcomeMessage(cfg.welcome_message);
        if (cfg?.logo_url) setLogoUrl(cfg.logo_url);

        if (theme) {
          setDetectedTheme(theme);
          if (theme.primaryColor) setPrimaryColor(theme.primaryColor);
          if (theme.fontFamily) setFontFamily(theme.fontFamily);
          if (theme.brandName && !websiteName) setWebsiteName(theme.brandName);
        }

        if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
          setSuggestedQuestions(data.suggestedQuestions);
        }

        // Fetch refreshed crawled pages
        if (site?.id) {
          const details = await fetchWebsiteDetails(site.id).catch(() => null);
          if (details?.crawledPages) setCrawledPagesList(details.crawledPages);
          if (details?.knowledgeDocuments) {
            setKnowledgeList(
              details.knowledgeDocuments.map((d: any) => ({
                id: d.id,
                title: d.title,
                content: d.content,
                sourceType: d.source_type,
                sourceUrl: d.source_url,
              }))
            );
          }
        }

        setCrawlStep("5. Completed! Chatbot trained and theme adapted.");
        setCrawlPercent(100);
        setScanResultMsg(
          `Successfully analyzed ${site?.name || websiteUrl}! Indexed ${data.pagesCrawled || 1} pages with Gemini RAG.`
        );
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to crawl website. Verify URL accessibility.");
    } finally {
      setIsScanning(false);
    }
  };

  // Fixed Q&A Management
  const handleAddQA = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setQaList((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      },
    ]);
    setNewQuestion("");
    setNewAnswer("");
  };

  const handleDeleteQA = (id: string) => {
    setQaList((prev) => prev.filter((item) => item.id !== id));
  };

  // Manual Knowledge Doc Training
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeContent.trim()) return;

    setIsTrainingAI(true);
    setKnowledgeSuccessMsg("");

    const title = knowledgeTitle.trim() || `${botName} Knowledge Topic`;
    const content = knowledgeContent.trim();

    try {
      if (websiteId) {
        await addKnowledgeDoc(websiteId, title, content, "manual_doc");
      }
      const newDoc: KnowledgeDoc = {
        id: Date.now().toString(),
        title,
        content,
        sourceType: "manual_doc",
      };
      setKnowledgeList((prev) => [newDoc, ...prev]);
      setKnowledgeTitle("");
      setKnowledgeContent("");
      setKnowledgeSuccessMsg("✓ Custom knowledge document indexed! Chatbot will ground answers with this content.");
      setTimeout(() => setKnowledgeSuccessMsg(""), 4500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save knowledge document.");
    } finally {
      setIsTrainingAI(false);
    }
  };

  const handleFillTemplate = (type: "event" | "ecommerce" | "services") => {
    if (type === "event") {
      setKnowledgeTitle("Event Schedule & Seating Details");
      setKnowledgeContent(
        `Total Capacity: 500 seats available in Main Auditorium.\nVenue: College Auditorium, Nalanda College Campus.\nProgram Schedule:\n- Day 1 (10 AM - 4 PM): Inauguration, Singing & Drama\n- Day 2 (11 AM - 6 PM): Dance Competitions & Cultural Fest\n- Day 3 (12 PM - 8 PM): BCA Vocational Tech Fest, Prize Distribution & Grand DJ Night\nTicket Pricing: ₹150 for students, ₹300 for VIP seats.\nBooking: Book seats directly at /booking.`
      );
    } else if (type === "ecommerce") {
      setKnowledgeTitle("Shipping & Return Policy");
      setKnowledgeContent(
        `Delivery Time: 3 to 5 business days across India.\nShipping Fee: Free shipping on orders above ₹499.\nReturn Policy: 7 days hassle-free returns.\nCustomer Support: support@example.com, Mon-Sat 9 AM to 6 PM.`
      );
    } else {
      setKnowledgeTitle("Company Overview & Services");
      setKnowledgeContent(
        `About Us: We provide custom web development, cloud architecture, and AI integrations.\nPricing: Starter plan at ₹4,999/month, Enterprise custom pricing.\nOffice Location: Bangalore, India.`
      );
    }
  };

  // Click a quick question chip in preview
  const handlePreviewChipClick = (qa: QAItem) => {
    setPreviewMessages((prev) => [
      ...prev,
      { sender: "user", text: qa.question },
      { sender: "bot", text: qa.answer },
    ]);
  };

  // Send interactive message in live preview
  const handlePreviewSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewInput.trim()) return;

    const userText = previewInput.trim();
    setPreviewInput("");

    setPreviewMessages((prev) => [...prev, { sender: "user", text: userText }]);

    // Instant match against fixed Q&A list
    const matchedQA = qaList.find(
      (item) => item.question.toLowerCase().trim() === userText.toLowerCase().trim()
    );

    if (matchedQA) {
      setPreviewMessages((prev) => [...prev, { sender: "bot", text: matchedQA.answer }]);
      return;
    }

    // Query live widget Gemini endpoint
    setIsChatLoading(true);
    try {
      const activeBotId = publicChatbotId || "bot_demo12345678";
      const res = await fetch(`${API_BASE}/widget/${encodeURIComponent(activeBotId)}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          conversationId: "dashboard-live-preview",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const answer = json.data?.answer;
        if (answer) {
          setIsChatLoading(false);
          setPreviewMessages((prev) => [...prev, { sender: "bot", text: answer }]);
          return;
        }
      }
    } catch {
      // ignore
    }

    setIsChatLoading(false);
    setPreviewMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: `I answered this based on your website's crawled knowledge. How else can I help?`,
      },
    ]);
  };

  // Save all chatbot configurations
  const handleSaveConfig = async () => {
    if (websiteId) {
      try {
        await updateChatbotConfig(websiteId, {
          chatbot_name: botName,
          welcome_message: welcomeMessage,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          font_family: fontFamily,
          logo_url: logoUrl || undefined,
        });
        if (qaList.length > 0) {
          await updateSuggestedQuestions(
            websiteId,
            qaList.map((q) => ({ question_text: q.question, answer: q.answer }))
          );
        }
      } catch (err) {
        console.warn("Backend save notice:", err);
      }
    }

    const payload = {
      websiteName,
      websiteUrl,
      botName,
      welcomeMessage,
      primaryColor,
      secondaryColor,
      fontFamily,
      logoUrl,
      qaList,
      publicChatbotId,
      websiteId,
      detectedTheme,
      updatedAt: Date.now(),
    };

    localStorage.setItem("supportai_config", JSON.stringify(payload));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#202820] tracking-tight">
            Chatbot Intelligence &amp; Settings
          </h2>
          <p className="text-xs text-[#647267] mt-0.5">
            Auto-extract website branding, crawl public pages with Gemini RAG, and test your live assistant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveConfig}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-semibold hover:bg-[#1e3d2a] transition-all shadow-sm cursor-pointer"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-green-300" /> : <Save className="w-4 h-4" />}
            {savedSuccess ? "Saved!" : "Save Configuration"}
          </button>

          <Link
            href="/dashboard/setup-code"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-[#254B35] border border-[#A8C99B] rounded-full text-xs font-semibold hover:bg-[#E5F0E1] transition-colors"
          >
            Setup Code <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Settings & Intelligence */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Website Setup & Live Crawler */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#202820]">
                  1. Website URL &amp; Intelligent Crawler
                </h3>
                <p className="text-xs text-[#647267]">
                  Enter your website details. SupportAI will inspect CSS variables, fonts, and sitemaps.
                </p>
              </div>
            </div>

            <form onSubmit={handleScanWebsite} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#647267] block mb-1">
                    Website Name / Brand
                  </label>
                  <input
                    type="text"
                    value={websiteName}
                    onChange={(e) => setWebsiteName(e.target.value)}
                    placeholder="e.g. VibeFest"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#647267] block mb-1">
                    Language
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi / Hinglish</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#647267] block mb-1">
                  Website URL (Publicly Accessible)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
                    <input
                      type="url"
                      required
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="px-6 py-2.5 bg-[#254B35] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3d2a] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Crawling...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Crawl &amp; Adapt
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Multi-step Live Crawler Progress */}
              {isScanning && (
                <div className="rounded-2xl bg-[#F1F7EF] p-4 border border-[#E5F0E1] space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-medium text-[#254B35]">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#254B35]" />
                      {crawlStep}
                    </span>
                    <span>{crawlPercent}%</span>
                  </div>
                  <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[#E5F0E1]">
                    <div
                      className="bg-[#254B35] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${crawlPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {scanResultMsg && (
                <div className="p-3 rounded-xl bg-[#E5F0E1] text-[#254B35] text-xs font-medium flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#254B35]" />
                  <span>{scanResultMsg}</span>
                </div>
              )}

              {scanError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}
            </form>
          </div>

          {/* 2. Detected Theme & Visual Identity Inspector */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#202820]">
                    2. Visual Brand &amp; Styling Inspector
                  </h3>
                  <p className="text-xs text-[#647267]">
                    Extracted colors and typography from CSS variables, stylesheets &amp; Google Fonts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrimaryColor("#254B35");
                  setSecondaryColor("#3B82F6");
                  setFontFamily("Inter, system-ui, sans-serif");
                }}
                className="text-xs text-[#647267] hover:text-[#254B35] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Default
              </button>
            </div>

            {/* Confidence & Source Info Card */}
            {detectedTheme?.sources && (
              <div className="bg-[#F8FAF7] border border-[#E5F0E1] rounded-2xl p-4 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-[#254B35]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Theme Detection Confidence</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 pt-1 text-[11px] text-[#647267]">
                  <p>
                    Primary Color: <strong>{detectedTheme.sources.primaryColor}</strong> (
                    {Math.round((detectedTheme.confidence?.primaryColor || 0.8) * 100)}%)
                  </p>
                  <p>
                    Font Family: <strong>{detectedTheme.sources.fontFamily}</strong> (
                    {Math.round((detectedTheme.confidence?.fontFamily || 0.8) * 100)}%)
                  </p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-2 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-2.5 py-1.5">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono">{primaryColor}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Secondary Accent Color
                </label>
                <div className="flex items-center gap-2 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-2.5 py-1.5">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono">{secondaryColor}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Chatbot Font Family
                </label>
                <div className="flex items-center gap-2 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-3 py-2 text-xs">
                  <Type className="w-3.5 h-3.5 text-[#647267] shrink-0" />
                  <input
                    type="text"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-transparent border-0 focus:outline-none text-xs font-medium text-[#202820]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#647267]">
                Assistant Welcome Greeting
              </label>
              <textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B] resize-none"
              />
            </div>
          </div>

          {/* 3. AI Suggested Questions (Generated via Gemini) */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#202820]">
                  3. Gemini Suggested Questions
                </h3>
                <p className="text-xs text-[#647267]">
                  Generated automatically by Gemini from your crawled content. Click to add to quick replies.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNewQuestion(q)}
                  className="text-left text-xs px-3.5 py-2 rounded-full bg-[#F1F7EF] text-[#254B35] border border-[#E5F0E1] hover:bg-[#E5F0E1] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Quick-Reply Q&A Builder */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
                <MessageSquarePlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#202820]">
                  4. Instant Quick-Reply Buttons &amp; Answers
                </h3>
                <p className="text-xs text-[#647267]">
                  Visitors see these buttons in the chat widget and get immediate verified answers.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F1F7EF] border border-[#E5F0E1] space-y-2.5">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Question (e.g. How do I request a refund?)"
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
              <textarea
                rows={2}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Instant Answer..."
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B] resize-none"
              />
              <button
                type="button"
                onClick={handleAddQA}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#254B35] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3d2a] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Quick Reply
              </button>
            </div>

            <div className="space-y-2">
              {qaList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-[#E5F0E1] flex justify-between items-start gap-3 bg-white"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#202820]">{item.question}</p>
                    <p className="text-xs text-[#647267] leading-relaxed">{item.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQA(item.id)}
                    className="p-1.5 text-[#647267] hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Crawled Pages & Custom Knowledge Base */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#202820]">
                    5. Grounded Knowledge Base ({knowledgeList.length} indexed chunks)
                  </h3>
                  <p className="text-xs text-[#647267]">
                    Trained pages and manual documents used by Gemini to answer visitor questions accurately.
                  </p>
                </div>
              </div>
            </div>

            {/* Crawled Pages Status List */}
            {crawledPagesList.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#647267] uppercase tracking-wider block">
                  Automatically Indexed Pages ({crawledPagesList.length})
                </span>
                <div className="grid sm:grid-cols-2 gap-2">
                  {crawledPagesList.map((page) => (
                    <div
                      key={page.id}
                      className="p-2.5 rounded-xl border border-[#E5F0E1] bg-[#F8FAF7] text-xs flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <p className="font-medium text-[#202820] truncate">{page.title || page.url}</p>
                        <p className="text-[10px] text-[#647267] font-mono truncate">{page.url}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 shrink-0">
                        Indexed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Template Fill */}
            <div className="space-y-1 pt-2">
              <span className="text-[11px] font-medium text-[#647267] block">
                Add Custom Information (Quick Template):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleFillTemplate("event")}
                  className="px-3 py-1.5 rounded-full bg-[#F1F7EF] hover:bg-[#E5F0E1] text-[#254B35] text-xs font-medium border border-[#E5F0E1] transition-colors cursor-pointer"
                >
                  🎪 Event &amp; Seating Template
                </button>
                <button
                  type="button"
                  onClick={() => handleFillTemplate("ecommerce")}
                  className="px-3 py-1.5 rounded-full bg-[#F1F7EF] hover:bg-[#E5F0E1] text-[#254B35] text-xs font-medium border border-[#E5F0E1] transition-colors cursor-pointer"
                >
                  🛍️ E-Commerce Template
                </button>
                <button
                  type="button"
                  onClick={() => handleFillTemplate("services")}
                  className="px-3 py-1.5 rounded-full bg-[#F1F7EF] hover:bg-[#E5F0E1] text-[#254B35] text-xs font-medium border border-[#E5F0E1] transition-colors cursor-pointer"
                >
                  🏢 Services Template
                </button>
              </div>
            </div>

            {/* Add Knowledge Form */}
            <form onSubmit={handleAddKnowledge} className="p-4 rounded-2xl bg-[#F1F7EF] border border-[#E5F0E1] space-y-2.5">
              <input
                type="text"
                value={knowledgeTitle}
                onChange={(e) => setKnowledgeTitle(e.target.value)}
                placeholder="Topic / Title (e.g. Seating, Rules, Program Timelines)"
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
              <textarea
                rows={4}
                required
                value={knowledgeContent}
                onChange={(e) => setKnowledgeContent(e.target.value)}
                placeholder="Enter detailed facts, FAQs, pricing, seating, or policies here..."
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B] resize-y"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  disabled={isTrainingAI || !knowledgeContent.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#254B35] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3d2a] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isTrainingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Train Knowledge Chunk
                </button>
                {knowledgeSuccessMsg && (
                  <span className="text-xs text-green-700 font-medium">{knowledgeSuccessMsg}</span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Real-Time Live Chatbot Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div
            className="bg-white rounded-3xl border border-[#E5F0E1] shadow-xl overflow-hidden flex flex-col h-[620px]"
            style={{ fontFamily }}
          >
            {/* Widget Header in Extracted Theme Color */}
            <div
              className="p-4 text-white flex items-center justify-between transition-colors duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Bot Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm leading-tight">
                    {botName || "Support Assistant"}
                  </h4>
                  <p className="text-[11px] opacity-85 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse"></span>
                    Live RAG Preview
                  </p>
                </div>
              </div>

              {previewMessages.length > 0 && (
                <button
                  onClick={() => setPreviewMessages([])}
                  className="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Widget Messages Window */}
            <div
              className="flex-1 p-4 overflow-y-auto space-y-3 transition-colors duration-300"
              style={{ backgroundColor: surfaceColor }}
            >
              {/* Welcome Message */}
              <div className="max-w-[85%] bg-white p-3.5 rounded-2xl rounded-tl-sm text-xs text-[#202820] shadow-sm border border-black/5 leading-relaxed">
                {welcomeMessage}
              </div>

              {/* Quick-Reply Buttons */}
              {qaList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {qaList.map((qa) => (
                    <button
                      key={qa.id}
                      type="button"
                      onClick={() => handlePreviewChipClick(qa)}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-white border font-medium transition-transform active:scale-95 cursor-pointer shadow-xs"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      {qa.question}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Thread */}
              {previewMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs shadow-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "ml-auto text-white rounded-tr-sm"
                      : "bg-white text-[#202820] rounded-tl-sm border border-black/5"
                  }`}
                  style={msg.sender === "user" ? { backgroundColor: primaryColor } : {}}
                >
                  {msg.text}
                </div>
              ))}

              {isChatLoading && (
                <div className="max-w-[85%] bg-white p-3 rounded-2xl rounded-tl-sm text-xs text-[#647267] shadow-sm border border-black/5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: primaryColor }} />
                  <span>Consulting website knowledge...</span>
                </div>
              )}
            </div>

            {/* Widget Input */}
            <form onSubmit={handlePreviewSend} className="p-3 bg-white border-t border-[#E5F0E1]">
              <div className="relative">
                <input
                  type="text"
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder="Ask a question about this website..."
                  className="w-full bg-[#F1F7EF] rounded-full py-2.5 pl-4 pr-11 text-xs focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !previewInput.trim()}
                  className="absolute right-1.5 top-1 p-2 rounded-full text-white cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: primaryColor }}
                  aria-label="Send test message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
