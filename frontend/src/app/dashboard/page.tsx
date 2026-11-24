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
  AlertCircle,
} from "lucide-react";
import {
  fetchWebsites,
  fetchWebsiteDetails,
  createWebsite,
  updateChatbotConfig,
  updateSuggestedQuestions,
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

interface DetectedThemeState {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  brandName?: string;
  suggestedColors?: string[];
}

/**
 * Ensures a valid 7-character hex string (#RRGGBB) for native HTML color picker inputs.
 */
function toValid7Hex(hex?: string, fallback = "#000000"): string {
  if (!hex) return fallback;
  let clean = hex.trim();
  if (!clean.startsWith("#")) clean = `#${clean}`;
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
    return clean.toUpperCase();
  }
  return fallback;
}

export default function ChatbotSettingsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Initial Config Loading State to prevent hardcoded defaults flashing on screen
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Website Scanner State
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState("");
  const [scanErrorMsg, setScanErrorMsg] = useState("");
  const [publicChatbotId, setPublicChatbotId] = useState("");
  const [websiteId, setWebsiteId] = useState("");

  // Bot Identity & Theme State
  const [botName, setBotName] = useState("Support Assistant");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! How can I help you today? Pick a quick question below or ask anything about our services."
  );
  const [primaryColor, setPrimaryColor] = useState("#254B35");
  const [secondaryColor, setSecondaryColor] = useState("#3B82F6");
  const [surfaceColor, setSurfaceColor] = useState("#F1F7EF");

  // Extracted Theme & Palette State
  const [detectedTheme, setDetectedTheme] = useState<DetectedThemeState | null>({
    primaryColor: "#254B35",
    secondaryColor: "#3B82F6",
    accentColor: "#A855F7",
    suggestedColors: ["#254B35", "#3B82F6", "#A855F7", "#EC4899", "#10B981"],
  });

  // AI Suggested Questions
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "What services or products do you offer?",
    "How do I request support or get help?",
    "What are your business hours?",
  ]);

  // Fixed Q&A State
  const [qaList, setQaList] = useState<QAItem[]>([
    {
      id: "default-1",
      question: "What are your support hours?",
      answer:
        "Our human support team is available Mon–Fri, 9 AM to 6 PM. This AI assistant is here 24/7!",
    },
  ]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Live Preview Chat State
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load live website & chatbot configuration directly from backend on mount and refresh
  useEffect(() => {
    let isMounted = true;
    setIsLoadingConfig(true);
    setScanErrorMsg("");

    async function loadConfig() {
      try {
        const sites = await fetchWebsites();
        if (!isMounted) return;

        if (Array.isArray(sites) && sites.length > 0) {
          const activeSite = sites[0];
          setWebsiteId(activeSite.id);
          setWebsiteUrl(activeSite.url || "");

          const details = await fetchWebsiteDetails(activeSite.id);
          if (!isMounted) return;

          const cfg = details.chatbotConfig;
          if (cfg) {
            if (cfg.public_chatbot_id) {
              setPublicChatbotId(cfg.public_chatbot_id);
              localStorage.setItem("supportai_public_chatbot_id", cfg.public_chatbot_id);
            }
            if (cfg.chatbot_name) setBotName(cfg.chatbot_name);
            if (cfg.welcome_message) setWelcomeMessage(cfg.welcome_message);
            if (cfg.primary_color) setPrimaryColor(cfg.primary_color);
            if (cfg.secondary_color) setSecondaryColor(cfg.secondary_color);
            if (cfg.background_color) setSurfaceColor(cfg.background_color);
          } else {
            setBotName(`${activeSite.name || "Support"} Assistant`);
          }

          // Load questions and Q&A from backend
          if (Array.isArray(details.suggestedQuestions) && details.suggestedQuestions.length > 0) {
            const rawQuestions = details.suggestedQuestions
              .map((q: any) => (typeof q === "string" ? q : q.question_text))
              .filter(Boolean);
            if (rawQuestions.length > 0) {
              setSuggestedQuestions(rawQuestions);
            }

            const mappedQa: QAItem[] = details.suggestedQuestions
              .filter((q: any) => typeof q === "object" && q.answer && q.answer.trim())
              .map((q: any) => ({
                id: q.id || String(Math.random()),
                question: q.question_text,
                answer: q.answer,
              }));
            if (mappedQa.length > 0) {
              setQaList(mappedQa);
            }
          }

          // Load extracted theme colors
          const extracted = details.extractedKnowledge?.themeColors || details.detectedTheme || {};
          const prim = cfg?.primary_color || extracted.primaryColor || "#254B35";
          const sec = cfg?.secondary_color || extracted.secondaryColor || "#3B82F6";
          const paletteColors = Array.from(
            new Set(
              [
                prim,
                sec,
                extracted.accentColor,
                extracted.backgroundColor,
                ...(extracted.suggestedColors || []),
              ].filter(Boolean)
            )
          ) as string[];

          setDetectedTheme({
            primaryColor: prim,
            secondaryColor: sec,
            accentColor: extracted.accentColor || sec,
            backgroundColor: cfg?.background_color || extracted.backgroundColor || "#F1F7EF",
            suggestedColors:
              paletteColors.length > 0
                ? paletteColors
                : [prim, sec, "#A855F7", "#EC4899", "#10B981"],
          });
        }
      } catch (err) {
        console.warn("Could not load backend config, checking local storage fallback:", err);
        const raw = typeof window !== "undefined" ? localStorage.getItem("supportai_config") : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.websiteUrl) setWebsiteUrl(parsed.websiteUrl);
            if (parsed.botName) setBotName(parsed.botName);
            if (parsed.welcomeMessage) setWelcomeMessage(parsed.welcomeMessage);
            if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
            if (parsed.secondaryColor) setSecondaryColor(parsed.secondaryColor);
            if (parsed.surfaceColor) setSurfaceColor(parsed.surfaceColor);
            if (parsed.publicChatbotId) setPublicChatbotId(parsed.publicChatbotId);
            if (parsed.detectedTheme) setDetectedTheme(parsed.detectedTheme);
            if (Array.isArray(parsed.qaList)) setQaList(parsed.qaList);
          } catch {}
        }
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  // Format and handle hex input changes smoothly
  const handleHexInput = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    let clean = val.trim();
    if (clean && !clean.startsWith("#")) {
      clean = `#${clean}`;
    }
    if (clean.length > 7) {
      clean = clean.substring(0, 7);
    }
    setter(clean.toUpperCase());
  };

  // Helper to extract clean unique colors from detectedTheme
  const getExtractedColors = () => {
    const list: Array<{ label: string; color: string }> = [];
    const seen = new Set<string>();

    const addColor = (label: string, color?: string) => {
      if (!color) return;
      let clean = color.trim().toUpperCase();
      if (!clean.startsWith("#")) clean = `#${clean}`;
      if (/^#[0-9A-F]{3,6}$/i.test(clean)) {
        const fullHex =
          clean.length === 4
            ? `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
            : clean;
        if (!seen.has(fullHex)) {
          seen.add(fullHex);
          list.push({ label, color: fullHex });
        }
      }
    };

    if (detectedTheme) {
      if (detectedTheme.primaryColor) addColor("Primary", detectedTheme.primaryColor);
      if (detectedTheme.accentColor) addColor("Accent", detectedTheme.accentColor);
      if (detectedTheme.secondaryColor) addColor("Secondary", detectedTheme.secondaryColor);
      if (detectedTheme.backgroundColor) addColor("Background", detectedTheme.backgroundColor);
      if (Array.isArray(detectedTheme.suggestedColors)) {
        detectedTheme.suggestedColors.forEach((c, idx) =>
          addColor(`Color ${idx + 1}`, c)
        );
      }
    }

    if (list.length === 0) {
      addColor("Brand", "#254B35");
      addColor("Accent", "#A855F7");
      addColor("Vibrant", "#EC4899");
      addColor("Secondary", "#3B82F6");
      addColor("Mint", "#10B981");
    }

    return list;
  };

  // AI Website Fetch & Auto-Adapt (Connected to live backend crawler & Gemini RAG)
  const handleScanWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setIsScanning(true);
    setScanResultMsg("");
    setScanErrorMsg("");

    try {
      const res = await createWebsite(websiteUrl.trim());
      const data = res?.data;
      if (data) {
        const cfg = data.chatbotConfig;
        const site = data.website;
        const extracted = data.detectedTheme || data.extractedKnowledge?.themeColors || {};

        if (site?.id) setWebsiteId(site.id);
        if (cfg?.public_chatbot_id) {
          setPublicChatbotId(cfg.public_chatbot_id);
          localStorage.setItem("supportai_public_chatbot_id", cfg.public_chatbot_id);
        }
        if (cfg?.chatbot_name) setBotName(cfg.chatbot_name);
        if (cfg?.welcome_message) setWelcomeMessage(cfg.welcome_message);

        const prim = extracted.primaryColor || cfg?.primary_color;
        const sec = extracted.secondaryColor || extracted.accentColor || cfg?.secondary_color;
        const acc = extracted.accentColor || sec;
        const bg = extracted.backgroundColor || cfg?.background_color;

        if (prim) setPrimaryColor(prim);
        if (sec) setSecondaryColor(sec);
        if (bg && bg !== "#FFFFFF") setSurfaceColor(bg);

        const suggestions: string[] = [];
        if (prim) suggestions.push(prim);
        if (acc && acc !== prim) suggestions.push(acc);
        if (sec && sec !== prim && sec !== acc) suggestions.push(sec);
        if (Array.isArray(extracted.suggestedColors)) {
          suggestions.push(...extracted.suggestedColors);
        }

        setDetectedTheme({
          primaryColor: prim || "#254B35",
          secondaryColor: sec || "#3B82F6",
          accentColor: acc || "#A855F7",
          backgroundColor: bg || "#F1F7EF",
          suggestedColors: Array.from(new Set(suggestions)),
        });

        if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
          setSuggestedQuestions(data.suggestedQuestions);
        }

        setScanResultMsg(
          `Successfully crawled ${site?.name || websiteUrl}: ${data.pagesCrawled || 1} pages indexed with Gemini AI knowledge!`
        );
      }
    } catch (err: any) {
      console.error("Live website crawl error:", err);
      setScanErrorMsg(
        err?.message || "Failed to crawl website. Please make sure the URL is valid and publicly reachable."
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Add Fixed Q&A
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

  // Delete Fixed Q&A
  const handleDeleteQA = (id: string) => {
    setQaList((prev) => prev.filter((item) => item.id !== id));
  };

  // Click a fixed Q&A chip inside the Live Preview
  const handlePreviewChipClick = (qa: QAItem) => {
    setPreviewMessages((prev) => [
      ...prev,
      { sender: "user", text: qa.question },
      { sender: "bot", text: qa.answer },
    ]);
  };

  // Send a test message inside the Live Preview (Checks fixed Q&A, then queries live Gemini AI)
  const handlePreviewSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewInput.trim()) return;

    const userText = previewInput.trim();
    setPreviewInput("");

    // Add user message to preview
    setPreviewMessages((prev) => [
      ...prev,
      { sender: "user", text: userText },
    ]);

    // 1. Instant check against fixed Q&A list
    const matchedQA = qaList.find(
      (item) => item.question.toLowerCase().trim() === userText.toLowerCase().trim()
    );

    if (matchedQA) {
      setPreviewMessages((prev) => [
        ...prev,
        { sender: "bot", text: matchedQA.answer },
      ]);
      return;
    }

    // 2. Query live Gemini Chatbot API
    try {
      const activeBotId = publicChatbotId || localStorage.getItem("supportai_public_chatbot_id") || "bot_demo12345678";
      const res = await fetch(`${API_BASE}/widget/${activeBotId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          conversationId: "dashboard-preview",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const answer = json.data?.answer;
        if (answer) {
          setPreviewMessages((prev) => [
            ...prev,
            { sender: "bot", text: answer },
          ]);
          return;
        }
      }
    } catch {
      // offline fallback
    }

    const botReply = `Thanks for asking! Once connected to your backend AI, ${botName} will answer this using your website knowledge.`;
    setPreviewMessages((prev) => [
      ...prev,
      { sender: "bot", text: botReply },
    ]);
  };

  // Save Config to local storage and backend
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const payload = {
        websiteUrl,
        botName,
        welcomeMessage,
        primaryColor,
        secondaryColor,
        surfaceColor,
        qaList,
        publicChatbotId,
        detectedTheme,
        updatedAt: Date.now(),
      };

      localStorage.setItem("supportai_config", JSON.stringify(payload));
      if (publicChatbotId) {
        localStorage.setItem("supportai_public_chatbot_id", publicChatbotId);
      }

      if (websiteId) {
        await updateChatbotConfig(websiteId, {
          chatbot_name: botName,
          welcome_message: welcomeMessage,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          background_color: surfaceColor,
        });

        const questionsPayload = [
          ...suggestedQuestions.map((q) => ({ question_text: q })),
          ...qaList.map((qa) => ({ question_text: qa.question, answer: qa.answer })),
        ];
        if (questionsPayload.length > 0) {
          await updateSuggestedQuestions(websiteId, questionsPayload).catch(() => undefined);
        }
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.warn("Failed to persist config to backend:", err);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-white/80 rounded-xl animate-pulse" />
            <div className="h-4 w-96 bg-white/60 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-44 bg-white/80 rounded-full animate-pulse" />
        </div>
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-40 bg-white/90 rounded-3xl border border-[#E5F0E1] p-6 shadow-sm flex flex-col justify-center gap-3">
              <div className="h-5 w-48 bg-[#E5F0E1] rounded animate-pulse" />
              <div className="h-11 w-full bg-[#F1F7EF] rounded-xl animate-pulse" />
            </div>
            <div className="h-64 bg-white/90 rounded-3xl border border-[#E5F0E1] p-6 shadow-sm flex flex-col justify-center gap-3">
              <div className="h-5 w-52 bg-[#E5F0E1] rounded animate-pulse" />
              <div className="h-12 w-full bg-[#F1F7EF] rounded-xl animate-pulse" />
              <div className="h-12 w-full bg-[#F1F7EF] rounded-xl animate-pulse" />
            </div>
            <div className="h-36 bg-white/90 rounded-3xl border border-[#E5F0E1] p-6 shadow-sm flex flex-col justify-center gap-3">
              <div className="h-5 w-40 bg-[#E5F0E1] rounded animate-pulse" />
              <div className="h-9 w-full bg-[#F1F7EF] rounded-full animate-pulse" />
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="h-[600px] bg-white/90 rounded-3xl border border-[#E5F0E1] shadow-xl p-4 flex flex-col justify-between">
              <div className="h-16 w-full bg-[#E5F0E1] rounded-2xl animate-pulse" />
              <div className="space-y-3 flex-1 py-6">
                <div className="h-12 w-3/4 bg-[#F1F7EF] rounded-2xl animate-pulse" />
                <div className="h-10 w-1/2 ml-auto bg-[#E5F0E1] rounded-2xl animate-pulse" />
              </div>
              <div className="h-12 w-full bg-[#F1F7EF] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#202820]">
            Configure Your Chatbot
          </h2>
          <p className="text-sm text-[#647267]">
            Scan your website to auto-adapt theme &amp; questions, or customize everything manually.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveConfig}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#254B35] text-white rounded-full text-sm font-medium hover:bg-[#1e3d2a] transition-all shadow-md cursor-pointer"
          >
            {savedSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedSuccess ? "Saved!" : "Save Configuration"}
          </button>

          <Link
            href="/dashboard/setup-code"
            className="inline-flex items-center gap-1.5 px-5 py-3 bg-white text-[#254B35] border border-[#A8C99B] rounded-full text-sm font-medium hover:bg-[#E5F0E1] transition-colors"
          >
            Setup Code <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Configuration Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Website URL Scanner */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#254B35]" />
              <h3 className="text-base font-semibold text-[#202820]">
                1. Fetch Website Data &amp; Auto-Adapt Theme
              </h3>
            </div>
            <p className="text-xs text-[#647267] mb-4">
              Enter your website URL. Our AI will extract your brand colors and suggest relevant customer questions.
            </p>
            <form
              onSubmit={handleScanWebsite}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                <input
                  type="url"
                  required
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>
              <button
                type="submit"
                disabled={isScanning}
                className="px-6 py-3 bg-[#254B35] text-white rounded-xl text-sm font-medium hover:bg-[#1e3d2a] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shrink-0"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
                  </>
                ) : (
                  "Fetch & Adapt"
                )}
              </button>
            </form>

            {scanResultMsg && (
              <div className="mt-3 p-3 rounded-xl bg-[#E5F0E1] text-[#254B35] text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{scanResultMsg}</span>
              </div>
            )}

            {scanErrorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{scanErrorMsg}</span>
              </div>
            )}
          </div>

          {/* 2. Visual Brand & Styling Inspector */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#254B35]" />
                <h3 className="text-base font-semibold text-[#202820]">
                  2. Visual Brand &amp; Styling Inspector
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrimaryColor("#254B35");
                  setSecondaryColor("#3B82F6");
                  setSurfaceColor("#F1F7EF");
                }}
                className="text-xs text-[#647267] hover:text-[#254B35] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Default
              </button>
            </div>

            {/* Quick Color Preview & Suggestion Row */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#202820] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#254B35]" />
                  Extracted Brand Palette ({getExtractedColors().length} Colors)
                </span>
                <span className="text-[11px] text-[#647267]">
                  One-click apply to Primary or Accent
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {getExtractedColors().map((item, idx) => (
                  <div
                    key={`${item.color}-${idx}`}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#E5F0E1] bg-white hover:border-[#A8C99B] transition-all shadow-2xs group"
                  >
                    <span
                      className="w-4 h-4 rounded-md border border-black/10 shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-semibold text-[#202820]">
                        {item.color}
                      </span>
                      {item.label && (
                        <span className="text-[9px] text-[#647267] font-medium leading-none">
                          {item.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-[#E5F0E1]">
                      <button
                        type="button"
                        onClick={() => setPrimaryColor(item.color)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                          primaryColor.toUpperCase() === item.color.toUpperCase()
                            ? "bg-[#254B35] text-white"
                            : "bg-[#F1F7EF] text-[#254B35] hover:bg-[#254B35] hover:text-white"
                        }`}
                        title={`Apply ${item.color} as Primary Brand Color`}
                      >
                        Primary
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecondaryColor(item.color)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                          secondaryColor.toUpperCase() === item.color.toUpperCase()
                            ? "bg-[#3B82F6] text-white"
                            : "bg-[#F1F7EF] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
                        }`}
                        title={`Apply ${item.color} as Secondary Accent Color`}
                      >
                        Accent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-[#647267]">
                  Chatbot Name
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>

              {/* Upgraded Color Inputs: Native Picker + Editable Hex Text Input */}
              <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3">
                {/* Primary Brand Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#647267]">
                      Primary Brand Color
                    </label>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#A8C99B] focus-within:border-[#A8C99B] transition-all">
                    <input
                      type="color"
                      value={toValid7Hex(primaryColor, "#254B35")}
                      onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      title="Pick Primary Color"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => handleHexInput(e.target.value, setPrimaryColor)}
                      placeholder="#254B35"
                      maxLength={7}
                      className="w-full bg-transparent text-xs font-mono font-semibold text-[#202820] focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Secondary Accent Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#647267]">
                      Secondary Accent Color
                    </label>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#A8C99B] focus-within:border-[#A8C99B] transition-all">
                    <input
                      type="color"
                      value={toValid7Hex(secondaryColor, "#3B82F6")}
                      onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      title="Pick Secondary Accent Color"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => handleHexInput(e.target.value, setSecondaryColor)}
                      placeholder="#3B82F6"
                      maxLength={7}
                      className="w-full bg-transparent text-xs font-mono font-semibold text-[#202820] focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Chat Background */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#647267]">
                      Chat Background
                    </label>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#A8C99B] focus-within:border-[#A8C99B] transition-all">
                    <input
                      type="color"
                      value={toValid7Hex(surfaceColor, "#F1F7EF")}
                      onChange={(e) => setSurfaceColor(e.target.value.toUpperCase())}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      title="Pick Background Color"
                    />
                    <input
                      type="text"
                      value={surfaceColor}
                      onChange={(e) => handleHexInput(e.target.value, setSurfaceColor)}
                      placeholder="#F1F7EF"
                      maxLength={7}
                      className="w-full bg-transparent text-xs font-mono font-semibold text-[#202820] focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#647267]">
                Welcome Message
              </label>
              <textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B] resize-none"
              />
            </div>
          </div>

          {/* 3. AI Suggested Questions */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm">
            <h3 className="text-base font-semibold text-[#202820] mb-1">
              3. AI Suggested Questions
            </h3>
            <p className="text-xs text-[#647267] mb-4">
              Click any suggested question to copy it into your Fixed Q&amp;A builder below.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNewQuestion(q)}
                  className="text-left text-xs px-3.5 py-2 rounded-full bg-[#F1F7EF] text-[#254B35] border border-[#E5F0E1] hover:bg-[#E5F0E1] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Fixed Questions & Fixed Answers */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-[#254B35]" />
              <div>
                <h3 className="text-base font-semibold text-[#202820]">
                  4. Fixed Questions &amp; Fixed Answers
                </h3>
                <p className="text-xs text-[#647267]">
                  Clients see these as quick-reply buttons and receive your exact answer immediately.
                </p>
              </div>
            </div>

            {/* Add Q&A Box */}
            <div className="p-4 rounded-2xl bg-[#F1F7EF] border border-[#E5F0E1] space-y-3">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Fixed Question (e.g. What is your return policy?)"
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
              <textarea
                rows={2}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Fixed Answer..."
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B] resize-none"
              />
              <button
                type="button"
                onClick={handleAddQA}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#254B35] text-white rounded-xl text-xs font-medium hover:bg-[#1e3d2a] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Fixed Q&amp;A
              </button>
            </div>

            {/* Saved Q&A List */}
            <div className="space-y-3">
              {qaList.length === 0 ? (
                <p className="text-xs text-[#647267] text-center py-4">
                  No fixed Q&amp;As added yet.
                </p>
              ) : (
                qaList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-[#E5F0E1] flex justify-between items-start gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#202820]">
                        {item.question}
                      </p>
                      <p className="text-xs text-[#647267] leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQA(item.id)}
                      className="p-2 text-[#647267] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      aria-label="Delete Q&A"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Interactive Live Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <div className="bg-white rounded-3xl border border-[#E5F0E1] shadow-xl overflow-hidden flex flex-col h-[600px]">
            {/* Widget Header: Updates in real-time with primaryColor & secondaryColor */}
            <div
              className="p-4 text-white flex items-center justify-between transition-colors duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: secondaryColor ? `${secondaryColor}33` : "rgba(255,255,255,0.2)",
                    border: secondaryColor ? `1.5px solid ${secondaryColor}` : "none",
                  }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {botName || "Support Assistant"}
                  </h4>
                  <p className="text-[11px] opacity-90 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block animate-pulse"
                      style={{ backgroundColor: secondaryColor || "#4ade80" }}
                    ></span>
                    Live Preview
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

            {/* Widget Messages */}
            <div
              className="flex-1 p-4 overflow-y-auto space-y-3 transition-colors duration-300"
              style={{ backgroundColor: surfaceColor }}
            >
              {/* Welcome Message */}
              <div className="max-w-[85%] bg-white p-3.5 rounded-2xl rounded-tl-sm text-xs text-[#202820] shadow-sm border border-black/5">
                {welcomeMessage}
              </div>

              {/* Clickable Fixed Question Chips: Accent color styled */}
              {qaList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {qaList.map((qa) => (
                    <button
                      key={qa.id}
                      type="button"
                      onClick={() => handlePreviewChipClick(qa)}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-white border font-medium transition-all active:scale-95 cursor-pointer shadow-xs hover:shadow-sm"
                      style={{
                        borderColor: secondaryColor || primaryColor,
                        color: secondaryColor || primaryColor,
                      }}
                    >
                      {qa.question}
                    </button>
                  ))}
                </div>
              )}

              {/* Interactive Replies: Real-time user message bubble color */}
              {previewMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs shadow-sm ${
                    msg.sender === "user"
                      ? "ml-auto text-white rounded-tr-sm"
                      : "bg-white text-[#202820] rounded-tl-sm border border-black/5"
                  }`}
                  style={
                    msg.sender === "user"
                      ? { backgroundColor: primaryColor }
                      : {}
                  }
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Widget Input: Real-time focus and send button coloring */}
            <form
              onSubmit={handlePreviewSend}
              className="p-3 bg-white border-t border-[#E5F0E1]"
            >
              <div className="relative">
                <input
                  type="text"
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder="Test typing a message..."
                  className="w-full bg-[#F1F7EF] rounded-full py-2.5 pl-4 pr-11 text-xs focus:outline-none transition-all"
                  style={{
                    borderColor: "#E5F0E1",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${secondaryColor || primaryColor}40`;
                    e.currentTarget.style.borderColor = secondaryColor || primaryColor;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "#E5F0E1";
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1 p-2 rounded-full text-white cursor-pointer transition-transform active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                  aria-label="Send test message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Live Color Bar Footer */}
            <div className="px-4 py-2 bg-[#F8FAF9] border-t border-[#E5F0E1] flex items-center justify-between text-[11px] text-[#647267]">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                />
                Brand: <span className="font-mono font-medium text-[#202820]">{primaryColor}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: secondaryColor }}
                />
                Accent: <span className="font-mono font-medium text-[#202820]">{secondaryColor}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
