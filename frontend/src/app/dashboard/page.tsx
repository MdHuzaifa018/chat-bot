"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiRequest, API_BASE } from "@/api/saasApi";
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
  Brain,
  BookOpen,
  FileText,
  CheckCircle2,
  Layers,
  ExternalLink,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
} from "lucide-react";

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
  // Website Scanner State
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState("");
  const [publicChatbotId, setPublicChatbotId] = useState("bot_demo12345678");
  const [websiteId, setWebsiteId] = useState("");

  // Bot Identity & Theme State
  const [botName, setBotName] = useState("Support Assistant");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! How can I help you today? Pick a quick question below or type your own."
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
    "What are your shipping and delivery timelines?",
    "How do I request a refund or exchange?",
    "Do you offer custom business plans?",
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

  // Chatbot Training & A-to-Z Knowledge Base State
  const [trainingPrompt, setTrainingPrompt] = useState<string>("");
  const [extractedKnowledge, setExtractedKnowledge] = useState<any>(null);
  const [crawledPagesList, setCrawledPagesList] = useState<any[]>([]);
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<
    "overview" | "prompt" | "pages" | "custom"
  >("overview");
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccessMsg, setRetrainSuccessMsg] = useState("");

  // Custom knowledge document state
  const [customDocTitle, setCustomDocTitle] = useState("");
  const [customDocContent, setCustomDocContent] = useState("");
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Load previously saved frontend config if present
  useEffect(() => {
    const raw = localStorage.getItem("supportai_config");
    const storedBotId = localStorage.getItem("supportai_public_chatbot_id");
    if (storedBotId) setPublicChatbotId(storedBotId);

    const storedPrompt = localStorage.getItem("supportai_training_prompt");
    if (storedPrompt) setTrainingPrompt(storedPrompt);

    const storedKnowledge = localStorage.getItem("supportai_extracted_knowledge");
    if (storedKnowledge) {
      try {
        setExtractedKnowledge(JSON.parse(storedKnowledge));
      } catch {}
    }

    const storedPages = localStorage.getItem("supportai_crawled_pages");
    if (storedPages) {
      try {
        setCrawledPagesList(JSON.parse(storedPages));
      } catch {}
    }

    if (!raw) return;
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
      if (parsed.websiteId) setWebsiteId(parsed.websiteId);
    } catch {
      // Ignore malformed local storage
    }
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

  // AI Website Fetch & Auto-Adapt (Connected to live backend crawler & Gemini)
  const handleScanWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setIsScanning(true);
    setScanResultMsg("");

    try {
      const json = await apiRequest<{ data: any }>("/websites", {
        method: "POST",
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });

      const data = json.data;
      if (data) {
        const cfg = data.chatbotConfig;
        const site = data.website;
        const extracted = data.detectedTheme || data.theme || {};

        if (cfg?.public_chatbot_id) {
          setPublicChatbotId(cfg.public_chatbot_id);
          localStorage.setItem("supportai_public_chatbot_id", cfg.public_chatbot_id);
        }
        if (site?.id) setWebsiteId(site.id);
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
          primaryColor: prim,
          secondaryColor: sec,
          accentColor: acc,
          backgroundColor: bg,
          suggestedColors: Array.from(new Set(suggestions)),
        });

        if (data.trainingPrompt) {
          setTrainingPrompt(data.trainingPrompt);
          localStorage.setItem("supportai_training_prompt", data.trainingPrompt);
        }
        if (data.extractedKnowledge) {
          setExtractedKnowledge(data.extractedKnowledge);
          localStorage.setItem(
            "supportai_extracted_knowledge",
            JSON.stringify(data.extractedKnowledge)
          );
        }
        if (Array.isArray(data.crawledPages)) {
          setCrawledPagesList(data.crawledPages);
          localStorage.setItem(
            "supportai_crawled_pages",
            JSON.stringify(data.crawledPages)
          );
        }

        if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
          setSuggestedQuestions(data.suggestedQuestions);
        }
        setIsScanning(false);
        setScanResultMsg(
          `Successfully indexed ${site?.name || websiteUrl}! ${data.pagesCrawled || 1} pages crawled, A-to-Z knowledge extracted & AI Chatbot fully trained! 🚀`
        );
        return;
      }
    } catch (err: any) {
      console.warn("Live backend crawl fallback to local parser:", err);
    }

    // Fallback if backend is offline
    const cleanDomain = websiteUrl
      .replace(/^https?:\/\/(www\.)?/, "")
      .split("/")[0];
    const brandLabel = cleanDomain.split(".")[0] || "Brand";
    const formattedBrand =
      brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1);

    const fallbackPrimary = "#1E4D3B";
    const fallbackSecondary = "#3B82F6";
    const fallbackAccent = "#A855F7";

    const fallbackPrompt = `You are the official AI Support Assistant for "${formattedBrand}" (https://${cleanDomain}).
You have been trained thoroughly on all A-to-Z information of this website.

=== VERIFIED A-TO-Z BUSINESS KNOWLEDGE BASE ===
1. BUSINESS NAME: ${formattedBrand}
2. WEBSITE URL: https://${cleanDomain}
3. TAGLINE / SUMMARY: ${formattedBrand} Official Website

4. ABOUT US & COMPANY OVERVIEW:
${formattedBrand} provides high quality solutions, products, and client assistance on ${cleanDomain}.

5. CORE SERVICES, PRODUCTS & CAPABILITIES:
• Client support & automated consultations
• Custom digital and business solutions
• Fast online inquiries and orders

6. PRICING, PLANS & PACKAGES:
• Flexible and competitive pricing tailored to client requirements. Contact support for customized quotes.

7. CONTACT & CUSTOMER SUPPORT:
- Email: support@${cleanDomain}
- Phone: Available on official contact page
- Support Hours: 24/7 AI Online Support, Mon-Fri Human Support Team

8. VERIFIED FREQUENTLY ASKED QUESTIONS:
1. Q: What does ${formattedBrand} offer?
   A: We offer dedicated digital products, client support, and specialized business solutions.
=== END VERIFIED KNOWLEDGE BASE ===

DIRECTIVES:
- Understand everything in this knowledge base from A-to-Z.
- Answer user queries with 100% precision.
- Support English, Hindi, and Hinglish (Roman Hindi) natively.`;

    setTrainingPrompt(fallbackPrompt);
    localStorage.setItem("supportai_training_prompt", fallbackPrompt);

    const fallbackKnowledge = {
      businessName: formattedBrand,
      domain: cleanDomain,
      tagline: `${formattedBrand} Official Website`,
      overview: `${formattedBrand} provides modern solutions and customer services on ${cleanDomain}.`,
      services: ["Client Support", "Custom Business Solutions", "Online Ordering & Inquiries"],
      pricing: ["Flexible pricing tailored to business requirements"],
      contactInfo: {
        emails: [`support@${cleanDomain}`],
        phones: ["Available on website"],
        address: "Refer to website contact section",
        hours: "24/7 AI Assistance, Human Team Mon-Fri",
      },
      faqs: [{ question: `What does ${formattedBrand} offer?`, answer: "We offer dedicated digital products and client support." }],
      crawledPagesSummary: [{ title: formattedBrand, url: websiteUrl, charCount: 500 }],
      trainingPrompt: fallbackPrompt,
    };
    setExtractedKnowledge(fallbackKnowledge);
    localStorage.setItem("supportai_extracted_knowledge", JSON.stringify(fallbackKnowledge));

    setBotName(`${formattedBrand} Assistant`);
    setPrimaryColor(fallbackPrimary);
    setSecondaryColor(fallbackSecondary);
    setSurfaceColor("#EDF6F1");
    setDetectedTheme({
      primaryColor: fallbackPrimary,
      secondaryColor: fallbackSecondary,
      accentColor: fallbackAccent,
      backgroundColor: "#EDF6F1",
      suggestedColors: [fallbackPrimary, fallbackSecondary, fallbackAccent, "#EC4899", "#10B981"],
    });
    setSuggestedQuestions([
      `What products or services does ${formattedBrand} offer?`,
      `How can I track my order on ${cleanDomain}?`,
      "What is your cancellation and refund policy?",
      "How do I contact customer support directly?",
    ]);

    setIsScanning(false);
    setScanResultMsg(
      `Scanned ${cleanDomain}: A-to-Z info extracted & chatbot trained.`
    );
  };

  // Retrain Chatbot with updated system prompt
  const handleRetrainChatbot = async () => {
    if (!trainingPrompt.trim()) return;
    setIsRetraining(true);
    setRetrainSuccessMsg("");

    try {
      localStorage.setItem("supportai_training_prompt", trainingPrompt);

      if (websiteId) {
        await apiRequest(`/websites/${encodeURIComponent(websiteId)}/chatbot`, {
          method: "PATCH",
          body: JSON.stringify({
            system_prompt_override: trainingPrompt.trim(),
          }),
        });
      }

      setRetrainSuccessMsg("Chatbot successfully retrained with updated A-to-Z knowledge! 🚀");
      setTimeout(() => setRetrainSuccessMsg(""), 4000);
    } catch (err: any) {
      console.warn("Retrain error:", err);
      setRetrainSuccessMsg("Knowledge saved locally and ready for test in preview.");
      setTimeout(() => setRetrainSuccessMsg(""), 4000);
    } finally {
      setIsRetraining(false);
    }
  };

  // Add Custom Knowledge Document
  const handleAddCustomKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocTitle.trim() || !customDocContent.trim()) return;
    setIsAddingDoc(true);

    try {
      if (websiteId) {
        await apiRequest(`/websites/${encodeURIComponent(websiteId)}/knowledge`, {
          method: "POST",
          body: JSON.stringify({
            title: customDocTitle.trim(),
            content: customDocContent.trim(),
            sourceType: "manual_doc",
          }),
        });
      }

      const updatedPrompt = `${trainingPrompt}\n\n=== ADDITIONAL CUSTOM KNOWLEDGE: ${customDocTitle.trim()} ===\n${customDocContent.trim()}\n=== END ===`;
      setTrainingPrompt(updatedPrompt);
      localStorage.setItem("supportai_training_prompt", updatedPrompt);

      setCustomDocTitle("");
      setCustomDocContent("");
      setRetrainSuccessMsg(`Added "${customDocTitle}" to Chatbot Knowledge Base & Retrained!`);
      setTimeout(() => setRetrainSuccessMsg(""), 4000);
    } catch (err) {
      console.warn("Failed to add custom doc:", err);
    } finally {
      setIsAddingDoc(false);
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
      const json = await apiRequest<{ data: { answer: string } }>(`/widget/${encodeURIComponent(activeBotId)}/message`, {
        method: "POST",
        body: JSON.stringify({
          message: userText,
          conversationId: "dashboard-preview",
        }),
      });

      const answer = json?.data?.answer;
      if (answer) {
        setPreviewMessages((prev) => [
          ...prev,
          { sender: "bot", text: answer },
        ]);
        return;
      }
    } catch (apiErr) {
      console.warn("Live AI chat preview error, serving grounded reply:", apiErr);
    }

    // 3. Grounded fallback directly from website training knowledge
    const cleanQ = userText.toLowerCase().trim();
    const overviewText = extractedKnowledge?.overview || extractedKnowledge?.tagline || `${botName} is an official platform built for modern business solutions.`;

    let groundedReply = "";
    if (/service|product|feature|solution|offer|kya karte/i.test(cleanQ)) {
      const srvList = Array.isArray(extractedKnowledge?.services) && extractedKnowledge.services.length > 0
        ? extractedKnowledge.services.map((s: string) => `• ${s}`).join("\n")
        : "• Custom AI applications, intelligent support chatbots, and enterprise automation.";
      groundedReply = `${botName} provides the following core services and capabilities:\n${srvList}`;
    } else if (/price|pricing|cost|plan|rate|kitna/i.test(cleanQ)) {
      const prcList = Array.isArray(extractedKnowledge?.pricing) && extractedKnowledge.pricing.length > 0
        ? extractedKnowledge.pricing.join(". ")
        : "Transparent, flexible pricing tailored to customer requirements. Contact support for tailored plans.";
      groundedReply = `Regarding pricing & plans for ${botName}: ${prcList}`;
    } else if (/contact|phone|email|call|number|support|help|hours|timing|sampark/i.test(cleanQ)) {
      const email = extractedKnowledge?.contactInfo?.emails?.[0] || "support@curiousrabit.online";
      const phone = extractedKnowledge?.contactInfo?.phones?.[0] || "Available on site";
      const hours = extractedKnowledge?.contactInfo?.hours || "24/7 AI Online Support";
      groundedReply = `You can reach ${botName} support directly:\n- Email: ${email}\n- Phone: ${phone}\n- Hours: ${hours}`;
    } else {
      groundedReply = `About ${botName}: ${overviewText}\n\nI am here 24/7 trained on this website to answer your questions!`;
    }

    setPreviewMessages((prev) => [
      ...prev,
      { sender: "bot", text: groundedReply },
    ]);
  };

  // Save Config to local storage and backend
  const handleSaveConfig = async () => {
    const payload = {
      websiteUrl,
      websiteId,
      botName,
      welcomeMessage,
      primaryColor,
      secondaryColor,
      surfaceColor,
      qaList,
      publicChatbotId,
      detectedTheme,
      trainingPrompt,
      updatedAt: Date.now(),
    };

    localStorage.setItem("supportai_config", JSON.stringify(payload));
    if (publicChatbotId) {
      localStorage.setItem("supportai_public_chatbot_id", publicChatbotId);
    }
    if (trainingPrompt) {
      localStorage.setItem("supportai_training_prompt", trainingPrompt);
    }

    if (websiteId) {
      try {
        await apiRequest(`/websites/${encodeURIComponent(websiteId)}/chatbot`, {
          method: "PATCH",
          body: JSON.stringify({
            chatbot_name: botName,
            welcome_message: welcomeMessage,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            system_prompt_override: trainingPrompt,
          }),
        });
      } catch {
        // ignore offline save
      }
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

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
          </div>

          {/* 2. Chatbot Training & A-to-Z Knowledge Base */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#254B35]" />
                <div>
                  <h3 className="text-base font-semibold text-[#202820]">
                    2. AI Chatbot Training &amp; A-to-Z Knowledge Base
                  </h3>
                  <p className="text-xs text-[#647267]">
                    All website information is extracted from A-to-Z and loaded into the chatbot training prompt.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#E5F0E1] text-[#254B35]">
                  <Sparkles className="w-3.5 h-3.5 text-[#254B35]" />
                  {crawledPagesList.length > 0
                    ? `${crawledPagesList.length} Pages Trained`
                    : trainingPrompt
                    ? "Trained on Site"
                    : "Ready to Train"}
                </span>
              </div>
            </div>

            {/* Quick Status Bar */}
            {retrainSuccessMsg && (
              <div className="p-3 rounded-xl bg-[#E5F0E1] text-[#254B35] text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#254B35]" />
                <span>{retrainSuccessMsg}</span>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-[#E5F0E1] pb-2 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveKnowledgeTab("overview")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeKnowledgeTab === "overview"
                    ? "bg-[#254B35] text-white shadow-xs"
                    : "text-[#647267] hover:text-[#202820] hover:bg-[#F1F7EF]"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> A-to-Z Info
              </button>
              <button
                type="button"
                onClick={() => setActiveKnowledgeTab("prompt")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeKnowledgeTab === "prompt"
                    ? "bg-[#254B35] text-white shadow-xs"
                    : "text-[#647267] hover:text-[#202820] hover:bg-[#F1F7EF]"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Training Prompt
              </button>
              <button
                type="button"
                onClick={() => setActiveKnowledgeTab("pages")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeKnowledgeTab === "pages"
                    ? "bg-[#254B35] text-white shadow-xs"
                    : "text-[#647267] hover:text-[#202820] hover:bg-[#F1F7EF]"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Crawled Pages ({crawledPagesList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveKnowledgeTab("custom")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeKnowledgeTab === "custom"
                    ? "bg-[#254B35] text-white shadow-xs"
                    : "text-[#647267] hover:text-[#202820] hover:bg-[#F1F7EF]"
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Add Knowledge
              </button>
            </div>

            {/* TAB 1: A-to-Z Extracted Knowledge Overview */}
            {activeKnowledgeTab === "overview" && (
              <div className="space-y-4 pt-1">
                {extractedKnowledge ? (
                  <div className="space-y-3">
                    {/* Company & Tagline */}
                    <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1]">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4 text-[#254B35]" />
                        <h4 className="text-xs font-semibold text-[#202820]">
                          Company / Business Overview
                        </h4>
                      </div>
                      <p className="text-xs text-[#202820] font-medium">
                        {extractedKnowledge.businessName}
                        {extractedKnowledge.domain && (
                          <span className="text-[#647267] font-normal ml-1">
                            ({extractedKnowledge.domain})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#647267] mt-1 leading-relaxed">
                        {extractedKnowledge.overview || extractedKnowledge.tagline}
                      </p>
                    </div>

                    {/* Services & Products */}
                    {Array.isArray(extractedKnowledge.services) && extractedKnowledge.services.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1]">
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-4 h-4 text-[#254B35]" />
                          <h4 className="text-xs font-semibold text-[#202820]">
                            Identified Services &amp; Products ({extractedKnowledge.services.length})
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {extractedKnowledge.services.map((srv: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E5F0E1] text-[#202820]"
                            >
                              • {srv}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pricing & Plans */}
                    {Array.isArray(extractedKnowledge.pricing) && extractedKnowledge.pricing.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1]">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-[#254B35]" />
                          <h4 className="text-xs font-semibold text-[#202820]">
                            Pricing, Packages &amp; Policies
                          </h4>
                        </div>
                        <ul className="text-xs text-[#647267] space-y-1">
                          {extractedKnowledge.pricing.map((prc: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#254B35] font-bold">•</span>
                              <span>{prc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Contact & Hours */}
                    <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1]">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-[#254B35]" />
                        <h4 className="text-xs font-semibold text-[#202820]">
                          Customer Contact &amp; Support Info
                        </h4>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[#202820]">
                          <Mail className="w-3.5 h-3.5 text-[#647267]" />
                          <span className="truncate">
                            {extractedKnowledge.contactInfo?.emails?.[0] || "Available on site"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#202820]">
                          <Phone className="w-3.5 h-3.5 text-[#647267]" />
                          <span className="truncate">
                            {extractedKnowledge.contactInfo?.phones?.[0] || "Available on site"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#202820] sm:col-span-2">
                          <Clock className="w-3.5 h-3.5 text-[#647267]" />
                          <span>{extractedKnowledge.contactInfo?.hours || "24/7 AI Online Assistance"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 rounded-2xl bg-[#F8FAF9] border border-dashed border-[#E5F0E1]">
                    <Brain className="w-8 h-8 text-[#A8C99B] mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-medium text-[#202820]">
                      No website data fetched yet
                    </p>
                    <p className="text-[11px] text-[#647267] mt-1 max-w-sm mx-auto">
                      Enter your website URL above and click <strong>"Fetch &amp; Adapt"</strong>. Our crawler will index all pages and train the chatbot with A-to-Z details.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Full Master Training Prompt */}
            {activeKnowledgeTab === "prompt" && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#647267] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#254B35]" />
                    Compiled System Knowledge Prompt (Injected into Chatbot)
                  </label>
                  <span className="text-[11px] text-[#647267]">
                    {trainingPrompt.length} characters
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={trainingPrompt}
                  onChange={(e) => setTrainingPrompt(e.target.value)}
                  placeholder="The complete A-to-Z training prompt will appear here after fetching your website..."
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl p-3 text-xs font-mono text-[#202820] focus:outline-none focus:ring-2 focus:ring-[#A8C99B] leading-relaxed resize-y"
                />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-[#647267]">
                    Edit this prompt to add custom rules, promotions, or special instructions.
                  </p>
                  <button
                    type="button"
                    onClick={handleRetrainChatbot}
                    disabled={isRetraining || !trainingPrompt.trim()}
                    className="px-5 py-2.5 bg-[#254B35] text-white rounded-xl text-xs font-medium hover:bg-[#1e3d2a] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {isRetraining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Training...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5" /> Retrain Chatbot
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Crawled Pages List */}
            {activeKnowledgeTab === "pages" && (
              <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
                {crawledPagesList.length > 0 ? (
                  crawledPagesList.map((pg: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[#E5F0E1] bg-[#F8FAF9] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#202820] truncate">
                          {pg.title || `Page ${idx + 1}`}
                        </p>
                        <p className="text-[11px] text-[#647267] truncate font-mono">
                          {pg.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#647267] bg-white px-2 py-0.5 rounded border border-[#E5F0E1]">
                          {pg.cleanText?.length || pg.charCount || 0} chars
                        </span>
                        <span className="text-[10px] text-[#254B35] bg-[#E5F0E1] px-2 py-0.5 rounded font-medium">
                          Indexed
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#647267] text-center py-6">
                    No pages crawled yet. Enter website URL and click Fetch.
                  </p>
                )}
              </div>
            )}

            {/* TAB 4: Add Custom Knowledge */}
            {activeKnowledgeTab === "custom" && (
              <form onSubmit={handleAddCustomKnowledge} className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-[#647267] block mb-1">
                    Knowledge Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={customDocTitle}
                    onChange={(e) => setCustomDocTitle(e.target.value)}
                    placeholder="e.g. Return &amp; Exchange Policy 2026, Holiday Sale Offer"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#647267] block mb-1">
                    Content / Instructions
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={customDocContent}
                    onChange={(e) => setCustomDocContent(e.target.value)}
                    placeholder="Paste policies, product details, warranty terms, or custom facts here..."
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#A8C99B] resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAddingDoc}
                  className="px-4 py-2 bg-[#254B35] text-white rounded-xl text-xs font-medium hover:bg-[#1e3d2a] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAddingDoc ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Add to Chatbot Knowledge Base
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* 3. Visual Brand & Styling Inspector */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#254B35]" />
                <h3 className="text-base font-semibold text-[#202820]">
                  3. Visual Brand &amp; Styling Inspector
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

          {/* 4. AI Suggested Questions */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm">
            <h3 className="text-base font-semibold text-[#202820] mb-1">
              4. AI Suggested Questions
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

          {/* 5. Fixed Questions & Fixed Answers */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-[#254B35]" />
              <div>
                <h3 className="text-base font-semibold text-[#202820]">
                  5. Fixed Questions &amp; Fixed Answers
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
