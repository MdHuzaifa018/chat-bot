"use client";

import React, { useState } from "react";
import {
  Palette,
  Bot,
  MessageSquare,
  CheckCircle2,
  Save,
  Sparkles,
  Send,
  Eye,
} from "lucide-react";

export default function ChatbotSettingsPage() {
  const [botName, setBotName] = useState("Acme Support Assistant");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hi there! 👋 Welcome to Acme Corp. How can I help you today?"
  );
  const [placeholderText, setPlaceholderText] = useState("Ask a question...");
  const [primaryColor, setPrimaryColor] = useState("#0F172A");
  const [secondaryColor, setSecondaryColor] = useState("#3B82F6");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [isSaved, setIsSaved] = useState(false);

  // Suggested questions sample
  const suggestedQuestions = [
    "What services do you provide?",
    "How can I contact sales?",
    "What are your pricing plans?",
  ];

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5F0E1] shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-[#202820]">Chatbot Visual Builder</h2>
          <p className="text-sm text-[#647267] mt-1">
            Customize the look, feel, greeting and position of the embedded chatbot.
          </p>
        </div>

        {isSaved && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F5E9] text-[#2E7D32] text-sm font-semibold rounded-full border border-[#A8C99B] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> Changes Saved!
          </div>
        )}
      </div>

      {/* Builder Layout: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Form */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-[#E5F0E1] shadow-sm space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                Assistant Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#254B35] text-sm text-[#202820] font-medium"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                Welcome Message
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#254B35] text-sm text-[#202820] font-medium leading-relaxed"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                Input Placeholder
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#254B35] text-sm text-[#202820]"
                value={placeholderText}
                onChange={(e) => setPlaceholderText(e.target.value)}
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-12 h-10 p-0 rounded-lg cursor-pointer border border-[#CBD5E1]"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-mono text-[#202820]"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                  Secondary / Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-12 h-10 p-0 rounded-lg cursor-pointer border border-[#CBD5E1]"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-mono text-[#202820]"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                Launcher Button Position
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPosition("bottom-right")}
                  className={`p-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    position === "bottom-right"
                      ? "border-[#254B35] bg-[#F1F7EF] text-[#254B35]"
                      : "border-[#CBD5E1] text-[#647267] hover:bg-gray-50"
                  }`}
                >
                  Bottom Right (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setPosition("bottom-left")}
                  className={`p-4 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    position === "bottom-left"
                      ? "border-[#254B35] bg-[#F1F7EF] text-[#254B35]"
                      : "border-[#CBD5E1] text-[#647267] hover:bg-gray-50"
                  }`}
                >
                  Bottom Left
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5F0E1] flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-3 bg-[#254B35] text-white rounded-full font-semibold text-sm hover:bg-[#1E3D2B] transition-all shadow-md"
              >
                <Save className="w-4 h-4" /> Save Chatbot Settings
              </button>
            </div>
          </form>
        </div>

        {/* Real-Time Live Preview */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#F1F7EF] to-[#E5F0E1] p-6 rounded-3xl border border-[#E5F0E1] flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs font-bold text-[#254B35] uppercase tracking-wider mb-4">
            <Eye className="w-4 h-4" /> Live Interactive Preview
          </div>

          {/* Chat Mockup Window */}
          <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[520px]">
            {/* Header */}
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white text-gray-800 flex items-center justify-center font-bold text-xs shadow">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{botName}</div>
                  <div className="text-[11px] opacity-80 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Online
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 bg-slate-50 overflow-y-auto space-y-3">
              {/* Assistant Welcome */}
              <div className="flex flex-col max-w-[85%] self-start">
                <div className="p-3 rounded-2xl rounded-bl-sm bg-white border border-gray-200 text-xs text-gray-800 leading-relaxed shadow-sm">
                  {welcomeMessage}
                </div>
              </div>

              {/* Suggested Questions */}
              <div className="pt-2 space-y-1.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Suggested Questions
                </div>
                {suggestedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 hover:border-blue-400 cursor-pointer transition-all shadow-sm flex items-center justify-between"
                  >
                    <span>{q}</span>
                    <Sparkles className="w-3 h-3 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Input */}
            <div className="p-3 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
                <input
                  type="text"
                  placeholder={placeholderText}
                  disabled
                  className="w-full bg-transparent text-xs text-gray-600 focus:outline-none"
                />
                <button
                  type="button"
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[10px] text-center text-gray-400 mt-2">
                Powered by <span className="font-semibold text-gray-600">SupportAI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
