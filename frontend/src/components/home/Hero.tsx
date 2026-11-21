"use client";

import React, { useState } from 'react';
import {
  Bot,
  ArrowRight,
  Sparkles,
  Globe,
  CheckCircle2,
  Loader2,
  Check,
  ExternalLink,
  Layers,
  Palette,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { createWebsite } from '@/api/saasApi';

export default function Hero() {
  const [url, setUrl] = useState("https://stripe.com");
  const [crawling, setCrawling] = useState(false);
  const [crawlStep, setCrawlStep] = useState<string | null>(null);
  const [crawlResult, setCrawlResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleBuildChatbot(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setErrorMsg(null);
    setCrawling(true);
    setCrawlResult(null);

    try {
      setCrawlStep("1/4: Connecting to website & verifying safety...");
      await new Promise((r) => setTimeout(r, 600));

      setCrawlStep("2/4: Crawling pages & extracting clean text...");
      await new Promise((r) => setTimeout(r, 800));

      setCrawlStep("3/4: Detecting brand colors, logo & styling...");
      await new Promise((r) => setTimeout(r, 800));

      setCrawlStep("4/4: Gemini AI generating smart questions...");

      const res = await createWebsite(url.trim());
      setCrawlResult(res.data);
      setCrawlStep("Complete!");
    } catch (err: any) {
      console.warn("Crawl failed:", err);
      setErrorMsg(err.message || "Failed to crawl website. Please make sure backend is running.");
    } finally {
      setCrawling(false);
    }
  }

  return (
    <section id="home" className="relative pt-20 pb-28 overflow-hidden bg-[#F1F7EF]">
      {/* Background radial accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#A8C99B]/30 rounded-full blur-3xl pointer-events-none -z-0"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: SaaS Value Proposition */}
          <div className="lg:col-span-7 max-w-2xl">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-semibold uppercase tracking-wider mb-6 border border-[#A8C99B]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#254B35]" />
              Multi-Tenant AI Chatbot SaaS
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-[#202820] leading-[1.12] tracking-tight mb-6">
              Turn Your Website Into an <br />
              <span className="font-bold text-[#254B35]">Intelligent AI Support Agent</span>
            </h1>

            <p className="text-lg text-[#647267] mb-8 leading-relaxed">
              Enter your website URL. Our platform automatically crawls your pages, learns your products and pricing, extracts your brand theme, and generates a branded AI support chatbot ready to embed with 1 line of JavaScript.
            </p>

            {/* Quick URL Input Demo Form — Now 100% Functional */}
            <form onSubmit={handleBuildChatbot} className="space-y-4 mb-8 max-w-xl">
              <div className="bg-white p-2.5 rounded-2xl border border-[#E5F0E1] shadow-md flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2.5 px-4 py-2">
                  <Globe className="w-5 h-5 text-[#254B35]" />
                  <input
                    type="url"
                    required
                    placeholder="https://yourwebsite.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={crawling}
                    className="w-full text-sm font-medium text-[#202820] placeholder:text-[#647267]/60 focus:outline-none bg-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={crawling}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#254B35] hover:bg-[#1a3525] text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {crawling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#A8C99B]" /> Crawling...
                    </>
                  ) : (
                    <>
                      Build Chatbot <ArrowRight className="w-4 h-4 text-[#A8C99B]" />
                    </>
                  )}
                </button>
              </div>

              {/* Live Crawl Progress Box */}
              {crawlStep && (
                <div className="p-4 rounded-2xl bg-white border border-[#A8C99B] text-sm text-[#254B35] flex items-center gap-3 shadow-sm animate-in fade-in">
                  {crawling ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#254B35] flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                  <span className="font-medium">{crawlStep}</span>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Successful Result Card with Live Brand Theme Proof */}
              {crawlResult && (
                <div className="p-6 rounded-3xl bg-white border-2 border-[#A8C99B] shadow-xl space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-green-700 flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Chatbot Generated Successfully!
                      </div>
                      <h4 className="text-base font-bold text-[#202820] mt-0.5">
                        {crawlResult.website?.name || "Website Bot"}
                      </h4>
                    </div>
                    <span className="px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-full text-xs font-semibold">
                      {crawlResult.pagesCrawled || 0} Pages Learned
                    </span>
                  </div>

                  {/* Brand Theme Detected */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#F8FAF7] rounded-xl border border-[#E5F0E1]">
                      <span className="text-[#647267] block mb-1">Detected Brand Color:</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: crawlResult.chatbotConfig?.primary_color || "#254B35" }}
                        ></span>
                        <span className="font-mono font-semibold text-[#202820]">
                          {crawlResult.chatbotConfig?.primary_color || "#254B35"}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-[#F8FAF7] rounded-xl border border-[#E5F0E1]">
                      <span className="text-[#647267] block mb-1">Generated Questions:</span>
                      <span className="font-bold text-[#254B35]">
                        {crawlResult.suggestedQuestions?.length || 4} Smart Questions
                      </span>
                    </div>
                  </div>

                  {/* Suggested questions list */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-[#647267] uppercase">
                      Gemini Smart Question Suggestions:
                    </div>
                    {(crawlResult.suggestedQuestions || []).slice(0, 3).map((q: string, idx: number) => (
                      <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#202820] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#254B35]"></span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Link
                      href="/dashboard"
                      className="flex-1 py-3 px-4 bg-[#254B35] text-white text-center rounded-xl text-xs font-bold hover:bg-[#1a3525] transition-all flex items-center justify-center gap-2 shadow"
                    >
                      Open in Dashboard &amp; Get 1-Line Embed Code <ArrowRight className="w-4 h-4 text-[#A8C99B]" />
                    </Link>
                    <Link
                      href={`/demo-embed.html?bot=${crawlResult.chatbotConfig?.public_chatbot_id || 'bot_demo12345678'}`}
                      target="_blank"
                      className="py-3 px-4 bg-white border border-[#CBD5E1] text-[#202820] text-center rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      Test Live <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </form>

            {/* Value checklist */}
            <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs font-medium text-[#647267]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> 60-second auto crawling
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> Auto brand color matching
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> 1-line script embed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> Powered by Gemini AI
              </span>
            </div>
          </div>

          {/* Right Column: Live External Website Preview Mockup with Branded Embedded Widget */}
          <div className="lg:col-span-5 relative">
            <div className="relative bg-white rounded-3xl shadow-2xl border border-[#E5F0E1] overflow-hidden">
              {/* Browser Mockup Chrome Bar */}
              <div className="bg-[#E5F0E1]/80 px-4 py-3 border-b border-[#E5F0E1] flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 bg-white px-3 py-1 rounded-md text-[11px] text-[#647267] font-mono truncate mx-2 text-center border border-[#E5F0E1]">
                  {url || "https://client-store.com"}
                </div>
              </div>

              {/* Sample Customer Website Content inside Mockup */}
              <div className="p-6 bg-slate-50 min-h-[380px] relative flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-10 w-4/5 bg-slate-300 rounded font-serif text-xs p-2 text-slate-700">
                    Modern Solutions &amp; Intelligent Support
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="h-16 bg-white border border-slate-200 rounded-xl p-2 text-[10px] text-slate-500">
                      Standard Package
                    </div>
                    <div className="h-16 bg-white border border-slate-200 rounded-xl p-2 text-[10px] text-slate-500">
                      Enterprise Support
                    </div>
                  </div>
                </div>

                {/* Floating Branded Chatbot Widget inside the Client Site */}
                <div className="bg-white rounded-2xl shadow-xl border border-[#A8C99B]/50 p-4 w-full mt-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: crawlResult?.chatbotConfig?.primary_color || "#254B35" }}
                      >
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#202820]">
                          {crawlResult?.chatbotConfig?.chatbot_name || "Support Assistant"}
                        </div>
                        <div className="text-[9px] text-green-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#E5F0E1] text-[#254B35] px-2 py-0.5 rounded-full font-semibold">
                      Live Widget
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#F1F7EF] text-[#202820] p-2.5 rounded-xl rounded-tl-sm text-[11px] leading-relaxed">
                      Hi there! I learned your site&apos;s products and pricing. Ask me anything!
                    </div>
                    {/* Suggested questions chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(crawlResult?.suggestedQuestions || ["What services do you offer?", "What are the pricing tiers?"]).slice(0, 2).map((q: string, i: number) => (
                        <span key={i} className="bg-white border border-[#E5F0E1] text-[10px] text-[#254B35] px-2 py-1 rounded-lg">
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
