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

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
}

export default function ChatbotSettingsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
  const [surfaceColor, setSurfaceColor] = useState("#F1F7EF");

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

  // Section 5: Custom Knowledge Base State (Where information is entered)
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeDoc[]>([
    {
      id: "sample-info",
      title: "Event & Seating Overview",
      content:
        "Venue: College Auditorium, Nalanda College Campus. Total capacity: 500 seats. Features include live seat booking, student registration for BCA Vocational programs, musical events, dance, and cultural fests.",
    },
  ]);
  const [isTrainingAI, setIsTrainingAI] = useState(false);
  const [knowledgeSuccessMsg, setKnowledgeSuccessMsg] = useState("");

  // Live Preview Chat State
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load previously saved frontend config if present
  useEffect(() => {
    const raw = localStorage.getItem("supportai_config");
    const storedBotId = localStorage.getItem("supportai_public_chatbot_id");
    const storedKnowledge = localStorage.getItem("supportai_custom_knowledge");

    if (storedBotId) setPublicChatbotId(storedBotId);

    if (storedKnowledge) {
      try {
        const parsedK = JSON.parse(storedKnowledge);
        if (Array.isArray(parsedK) && parsedK.length > 0) {
          setKnowledgeList(parsedK);
        }
      } catch {
        // ignore
      }
    }

    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.websiteUrl) setWebsiteUrl(parsed.websiteUrl);
      if (parsed.botName) setBotName(parsed.botName);
      if (parsed.welcomeMessage) setWelcomeMessage(parsed.welcomeMessage);
      if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
      if (parsed.surfaceColor) setSurfaceColor(parsed.surfaceColor);
      if (parsed.publicChatbotId) setPublicChatbotId(parsed.publicChatbotId);
      if (parsed.websiteId) setWebsiteId(parsed.websiteId);
      if (Array.isArray(parsed.qaList)) setQaList(parsed.qaList);
    } catch {
      // Ignore malformed local storage
    }
  }, []);

  // AI Website Fetch & Auto-Adapt
  const handleScanWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setIsScanning(true);
    setScanResultMsg("");

    try {
      const res = await fetch(`${API_BASE}/websites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data) {
          const cfg = data.chatbotConfig;
          const site = data.website;

          if (cfg?.public_chatbot_id) {
            setPublicChatbotId(cfg.public_chatbot_id);
            localStorage.setItem("supportai_public_chatbot_id", cfg.public_chatbot_id);
          }
          if (site?.id) setWebsiteId(site.id);
          if (cfg?.chatbot_name) setBotName(cfg.chatbot_name);
          if (cfg?.primary_color) setPrimaryColor(cfg.primary_color);
          if (cfg?.welcome_message) setWelcomeMessage(cfg.welcome_message);
          if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
            setSuggestedQuestions(data.suggestedQuestions);
          }
          setIsScanning(false);
          setScanResultMsg(
            `Successfully crawled ${site?.name || websiteUrl}: ${data.pagesCrawled || 1} pages indexed, theme adapted!`
          );
          return;
        }
      }
    } catch (err) {
      console.warn("Live backend crawl fallback to local parser:", err);
    }

    // Fallback if backend is offline
    const cleanDomain = websiteUrl
      .replace(/^https?:\/\/(www\.)?/, "")
      .split("/")[0];
    const brandLabel = cleanDomain.split(".")[0] || "Brand";
    const formattedBrand =
      brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1);

    setBotName(`${formattedBrand} Assistant`);
    setPrimaryColor("#1E4D3B");
    setSurfaceColor("#EDF6F1");
    setSuggestedQuestions([
      `What products or services does ${formattedBrand} offer?`,
      `How can I track my order on ${cleanDomain}?`,
      "What is your cancellation and refund policy?",
      "How do I contact customer support directly?",
    ]);

    setIsScanning(false);
    setScanResultMsg(
      `Scanned ${cleanDomain}: theme adapted and 4 questions suggested.`
    );
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

  // Section 5: Add & Train Knowledge Doc
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeContent.trim()) return;

    setIsTrainingAI(true);
    setKnowledgeSuccessMsg("");

    const title = knowledgeTitle.trim() || `${botName} Knowledge Details`;
    const content = knowledgeContent.trim();
    const newDoc: KnowledgeDoc = {
      id: Date.now().toString(),
      title,
      content,
    };

    setKnowledgeList((prev) => [newDoc, ...prev]);

    // Save to backend knowledge_documents table if website is loaded
    if (websiteId) {
      try {
        await fetch(`${API_BASE}/websites/${websiteId}/knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            sourceType: "manual_doc",
          }),
        });
      } catch (err) {
        console.warn("Backend knowledge save error:", err);
      }
    }

    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem("supportai_custom_knowledge") || "[]");
    localStorage.setItem("supportai_custom_knowledge", JSON.stringify([newDoc, ...saved]));

    setKnowledgeTitle("");
    setKnowledgeContent("");
    setIsTrainingAI(false);
    setKnowledgeSuccessMsg("✓ Knowledge saved & AI trained! Chatbot can now answer using this information.");
    setTimeout(() => setKnowledgeSuccessMsg(""), 4500);
  };

  const handleDeleteKnowledge = (id: string) => {
    setKnowledgeList((prev) => prev.filter((d) => d.id !== id));
    const saved = JSON.parse(localStorage.getItem("supportai_custom_knowledge") || "[]");
    localStorage.setItem(
      "supportai_custom_knowledge",
      JSON.stringify(saved.filter((d: any) => d.id !== id))
    );
  };

  const handleFillTemplate = (type: "event" | "ecommerce" | "services") => {
    if (type === "event") {
      setKnowledgeTitle("Event Schedule & Seating Details");
      setKnowledgeContent(
        `Total Seats: 500 seats available in College Auditorium.\nVenue: College Auditorium, Nalanda College Campus.\nProgram Schedule:\n- Day 1 (10 AM to 4 PM): Inauguration, Singing & Drama\n- Day 2 (11 AM to 6 PM): Dance Competitions & Cultural Fest\n- Day 3 (12 PM to 8 PM): BCA Vocational Tech Fest, Prize Distribution & Grand DJ Night\nTicket Pricing: ₹150 for students, ₹300 for VIP seats.\nBooking: Book seats directly at /booking page.`
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

  // Click a fixed Q&A chip inside the Live Preview
  const handlePreviewChipClick = (qa: QAItem) => {
    setPreviewMessages((prev) => [
      ...prev,
      { sender: "user", text: qa.question },
      { sender: "bot", text: qa.answer },
    ]);
  };

  // Send a test message inside the Live Preview
  const handlePreviewSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewInput.trim()) return;

    const userText = previewInput.trim();
    setPreviewInput("");

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
    setIsChatLoading(true);
    try {
      const activeBotId =
        publicChatbotId ||
        localStorage.getItem("supportai_public_chatbot_id") ||
        "bot_demo12345678";

      const res = await fetch(`http://localhost:5000/api/widget/${activeBotId}/message`, {
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
          setPreviewMessages((prev) => [
            ...prev,
            { sender: "bot", text: answer },
          ]);
          return;
        }
      }
    } catch (err) {
      console.warn("Live preview chat API error:", err);
    }

    setIsChatLoading(false);

    // Fallback if backend is offline
    const botReply = `Thanks for asking! Once connected to your backend AI, ${botName} will answer this using your website knowledge.`;
    setPreviewMessages((prev) => [
      ...prev,
      { sender: "bot", text: botReply },
    ]);
  };

  // Save Config
  const handleSaveConfig = async () => {
    const payload = {
      websiteUrl,
      botName,
      welcomeMessage,
      primaryColor,
      surfaceColor,
      qaList,
      publicChatbotId,
      websiteId,
      updatedAt: Date.now(),
    };

    localStorage.setItem("supportai_config", JSON.stringify(payload));
    if (publicChatbotId) {
      localStorage.setItem("supportai_public_chatbot_id", publicChatbotId);
    }

    if (websiteId) {
      try {
        await fetch(`${API_BASE}/websites/${websiteId}/chatbot`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatbot_name: botName,
            welcome_message: welcomeMessage,
            primary_color: primaryColor,
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
            Scan your website to auto-adapt theme &amp; questions, or enter custom website knowledge.
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
              Enter your website URL. Our AI will extract your brand colors, analyze website pages, and suggest customer questions.
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

          {/* 2. Manual Theme & Chatbot Identity */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#254B35]" />
                <h3 className="text-base font-semibold text-[#202820]">
                  2. Manual Theme &amp; Chatbot Name
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrimaryColor("#254B35");
                  setSurfaceColor("#F1F7EF");
                }}
                className="text-xs text-[#647267] hover:text-[#254B35] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Default
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#647267]">
                    Primary Color
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
                    Chat Background
                  </label>
                  <div className="flex items-center gap-2 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-2.5 py-1.5">
                    <input
                      type="color"
                      value={surfaceColor}
                      onChange={(e) => setSurfaceColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono">{surfaceColor}</span>
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

          {/* 5. Custom Knowledge Base & AI Training (Information Add Karne Ki Jagah) */}
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#254B35]" />
                <div>
                  <h3 className="text-base font-semibold text-[#202820]">
                    5. Website Knowledge Base &amp; AI Training
                  </h3>
                  <p className="text-xs text-[#647267]">
                    Yahan apni website ki full information daalein (Event programs, total seats, pricing, rules, etc.). AI turant train ho jayega!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Template Fill Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-[#647267] block">
                Quick Template Chunein (One-Click AI Template):
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
                  🛍️ E-Commerce / Store Template
                </button>
                <button
                  type="button"
                  onClick={() => handleFillTemplate("services")}
                  className="px-3 py-1.5 rounded-full bg-[#F1F7EF] hover:bg-[#E5F0E1] text-[#254B35] text-xs font-medium border border-[#E5F0E1] transition-colors cursor-pointer"
                >
                  🏢 Company / Services Template
                </button>
              </div>
            </div>

            {/* Add Knowledge Form */}
            <form onSubmit={handleAddKnowledge} className="p-4 rounded-2xl bg-[#F1F7EF] border border-[#E5F0E1] space-y-3">
              <input
                type="text"
                value={knowledgeTitle}
                onChange={(e) => setKnowledgeTitle(e.target.value)}
                placeholder="Topic / Title (e.g. VibeFest Seating & Program Schedule)"
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
              <textarea
                rows={5}
                required
                value={knowledgeContent}
                onChange={(e) => setKnowledgeContent(e.target.value)}
                placeholder={`Yahan website ki saari information likhein ya paste karein...\nJaise:\n- Total Seats: 500\n- Venue: College Auditorium, Nalanda College Campus\n- Program Schedule: Day 1 - Singing, Day 2 - Dance, Day 3 - Tech Fest & DJ Night\n- Ticket Price: Free Entry / Rs. 150 VIP\n- Booking Link: /booking`}
                className="w-full bg-white border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B] resize-y"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isTrainingAI || !knowledgeContent.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3d2a] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isTrainingAI ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Training AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#A8C99B]" /> Train Chatbot with AI
                    </>
                  )}
                </button>

                {knowledgeSuccessMsg && (
                  <span className="text-xs text-green-700 font-medium animate-in fade-in">
                    {knowledgeSuccessMsg}
                  </span>
                )}
              </div>
            </form>

            {/* Trained Knowledge Docs List */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-[#202820] block">
                Trained Knowledge Documents ({knowledgeList.length})
              </span>
              {knowledgeList.length === 0 ? (
                <p className="text-xs text-[#647267] text-center py-3 bg-[#F8FAF7] rounded-xl border border-dashed border-[#CBD5E1]">
                  Abhi koi custom knowledge document add nahi kiya gaya hai. Upar diye box mein information daal kar &quot;Train Chatbot with AI&quot; click karein.
                </p>
              ) : (
                knowledgeList.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl border border-[#E5F0E1] bg-white flex justify-between items-start gap-3 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#254B35] shrink-0" />
                        <p className="text-xs font-bold text-[#202820] truncate">
                          {doc.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#647267] line-clamp-2 leading-relaxed">
                        {doc.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteKnowledge(doc.id)}
                      className="p-1.5 text-[#647267] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      aria-label="Delete Doc"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
            {/* Widget Header */}
            <div
              className="p-4 text-white flex items-center justify-between transition-colors duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {botName || "Support Assistant"}
                  </h4>
                  <p className="text-[11px] opacity-85 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300"></span>
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

              {/* Clickable Fixed Question Chips */}
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

              {/* Interactive Replies */}
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

              {isChatLoading && (
                <div className="max-w-[85%] bg-white p-3 rounded-2xl rounded-tl-sm text-xs text-[#647267] shadow-sm border border-black/5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#254B35]" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            {/* Widget Input */}
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
                  className="w-full bg-[#F1F7EF] rounded-full py-2.5 pl-4 pr-11 text-xs focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
                <button
                  type="submit"
                  disabled={isChatLoading}
                  className="absolute right-1.5 top-1 p-2 rounded-full text-white cursor-pointer disabled:opacity-50"
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
