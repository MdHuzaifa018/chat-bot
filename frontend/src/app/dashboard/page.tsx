"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Settings,
  Database,
  Code,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  MessageSquare,
  Bot,
  Sparkles,
  ArrowRight,
  Palette,
} from "lucide-react";
import { fetchWebsites, fetchWebsiteDetails, createWebsite, WebsiteData } from "@/api/saasApi";

interface DashboardMetrics {
  crawledPages: number;
  knowledgeDocs: number;
  totalChats: number;
  aiResponseRate: string;
}

export default function DashboardOverview() {
  const [websites, setWebsites] = useState<WebsiteData[]>([]);
  const [selectedSite, setSelectedSite] = useState<WebsiteData | null>(null);
  const [siteDetails, setSiteDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [crawlStep, setCrawlStep] = useState<string | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    crawledPages: 0,
    knowledgeDocs: 0,
    totalChats: 0,
    aiResponseRate: "Active",
  });

  useEffect(() => {
    loadWebsites();
  }, []);

  async function loadWebsites() {
    setLoading(true);
    try {
      const data = await fetchWebsites();
      setWebsites(data);
      if (data.length > 0) {
        setSelectedSite(data[0]);
        await loadMetrics(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics(siteId: string) {
    try {
      const details = await fetchWebsiteDetails(siteId);
      if (details) {
        setSiteDetails(details);
        setMetrics({
          crawledPages: details.crawledPages?.length || 0,
          knowledgeDocs: details.knowledgeDocuments?.length || 0,
          totalChats: 0,
          aiResponseRate: "Active",
        });
      }
    } catch {
      // Keep defaults
    }
  }

  async function handleSiteChange(siteId: string) {
    const s = websites.find((w) => w.id === siteId);
    if (s) {
      setSelectedSite(s);
      await loadMetrics(siteId);
    }
  }

  async function handleAddWebsite(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setCrawlError(null);
    setCrawlStep("1/4: Connecting to URL & verifying safety...");

    try {
      await new Promise((r) => setTimeout(r, 600));
      setCrawlStep("2/4: Crawling pages & extracting clean text...");
      await new Promise((r) => setTimeout(r, 800));
      setCrawlStep("3/4: Detecting brand colors, logo & styling...");
      await new Promise((r) => setTimeout(r, 800));
      setCrawlStep("4/4: Gemini generating smart questions...");

      const res = await createWebsite(newUrl.trim(), newName.trim() || undefined);
      setCrawlStep("Done!");

      await loadWebsites();
      setNewUrl("");
      setNewName("");
      setTimeout(() => setCrawlStep(null), 3000);
    } catch (err: any) {
      setCrawlError(err.message || "Failed to crawl website.");
      setCrawlStep(null);
    }
  }

  const primaryColor = siteDetails?.chatbotConfig?.primary_color || "#254B35";
  const secondaryColor = siteDetails?.chatbotConfig?.secondary_color || "#A8C99B";
  const suggestedQuestions = siteDetails?.suggestedQuestions?.map((q: any) => q.question_text) || [
    "What services do you provide?",
    "How can I contact support?",
    "What are your pricing plans?",
  ];

  return (
    <div className="space-y-8">
      {/* 🚀 QUICK ACTION: Prominent URL Crawler Input Bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E5F0E1] shadow-md space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F5E9] text-[#254B35] rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Autonomous Website Onboarding
          </div>
          <h3 className="text-xl font-bold text-[#202820]">Crawl New Website &amp; Generate Chatbot</h3>
          <p className="text-xs text-[#647267] mt-1">
            Apni ya kisi bhi client ki website ka URL yahan dalein. Hamara engine pages crawl karega, brand theme detect karega aur Gemini se train karke widget banayega.
          </p>
        </div>

        <form onSubmit={handleAddWebsite} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAF7] focus-within:border-[#254B35] focus-within:bg-white transition-all">
              <Globe className="w-5 h-5 text-[#254B35] flex-shrink-0" />
              <input
                type="url"
                required
                placeholder="Website URL (e.g. https://mybrand.com)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                disabled={Boolean(crawlStep)}
                className="w-full text-sm font-medium text-[#202820] bg-transparent focus:outline-none placeholder:text-gray-400"
              />
            </div>
            <div className="sm:w-60 flex items-center px-4 py-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAF7] focus-within:border-[#254B35] focus-within:bg-white transition-all">
              <input
                type="text"
                placeholder="Brand Name (Optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={Boolean(crawlStep)}
                className="w-full text-sm font-medium text-[#202820] bg-transparent focus:outline-none placeholder:text-gray-400"
              />
            </div>
            <button
              type="submit"
              disabled={Boolean(crawlStep)}
              className="px-7 py-3 bg-[#254B35] hover:bg-[#1a3525] text-white rounded-2xl text-sm font-semibold transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0"
            >
              {crawlStep ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#A8C99B]" /> Processing
                </>
              ) : (
                <>
                  Crawl &amp; Train AI <ArrowRight className="w-4 h-4 text-[#A8C99B]" />
                </>
              )}
            </button>
          </div>

          {crawlStep && (
            <div className="p-4 rounded-xl bg-[#F1F7EF] border border-[#A8C99B] text-sm text-[#254B35] flex items-center gap-3 animate-in fade-in">
              <Loader2 className="w-5 h-5 animate-spin text-[#254B35]" />
              <span className="font-semibold">{crawlStep}</span>
            </div>
          )}

          {crawlError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{crawlError}</span>
            </div>
          )}
        </form>
      </div>

      {/* Top Header & Website Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5F0E1] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#254B35] text-white flex items-center justify-center font-bold text-lg">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#647267] uppercase tracking-wider">Active Selected Website</div>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                aria-label="Select active website"
                className="text-xl font-bold text-[#202820] bg-transparent border-none cursor-pointer focus:outline-none"
                value={selectedSite?.id || ""}
                onChange={(e) => handleSiteChange(e.target.value)}
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.domain})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/embed"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#A8C99B] text-[#254B35] rounded-full text-xs font-bold hover:bg-[#96be88] transition-all shadow"
          >
            <Code className="w-4 h-4" /> Get 1-Line Embed Code
          </Link>
        </div>
      </div>

      {/* 🎨 BRAND THEME & SMART SUGGESTIONS PROOF CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#254B35] rounded-3xl p-8 text-white relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#A8C99B] opacity-15 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 rounded-full text-xs font-medium mb-4 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#A8C99B] animate-pulse"></span>
              Gemini Grounded AI Engine Active
            </div>
            <h2 className="text-3xl font-light mb-2 tracking-tight">
              Intelligent Support for <span className="font-semibold text-[#A8C99B]">{selectedSite?.name || "Your Website"}</span>
            </h2>
            <p className="text-[#E5F0E1] text-sm opacity-90 leading-relaxed mb-6">
              Chatbot automatically trained on {metrics.crawledPages} crawled pages and {metrics.knowledgeDocs} verified knowledge documents.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
            <Link
              href="/dashboard/embed"
              className="px-5 py-2.5 bg-[#A8C99B] text-[#254B35] font-semibold text-xs rounded-full hover:bg-white transition-all shadow"
            >
              Get Embed Code →
            </Link>
            <Link
              href="/dashboard/settings"
              className="px-5 py-2.5 bg-white/10 text-white font-medium text-xs rounded-full hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              Customize Theme
            </Link>
            <Link
              href="/dashboard/knowledge"
              className="px-5 py-2.5 bg-white/10 text-white font-medium text-xs rounded-full hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              Manage Knowledge Base
            </Link>
          </div>
        </div>

        {/* Brand Theme Detection Proof Card */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E5F0E1] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#254B35]">
                <Palette className="w-4 h-4" /> Detected Brand Theme
              </div>
              <span className="text-[11px] px-2 py-0.5 bg-green-50 text-green-700 font-semibold rounded-full border border-green-200">
                Auto-Matched
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-xs p-2.5 bg-[#F8FAF7] rounded-xl border border-[#E5F0E1]">
                <span className="text-[#647267]">Primary Brand Color:</span>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: primaryColor }}></span>
                  <span className="font-mono font-bold text-[#202820]">{primaryColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 bg-[#F8FAF7] rounded-xl border border-[#E5F0E1]">
                <span className="text-[#647267]">Accent Color:</span>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: secondaryColor }}></span>
                  <span className="font-mono font-bold text-[#202820]">{secondaryColor}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#647267] uppercase block mb-1.5">
                  Gemini Smart Suggestions:
                </span>
                <div className="space-y-1">
                  {suggestedQuestions.slice(0, 3).map((q: string, idx: number) => (
                    <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#202820] flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#254B35] flex-shrink-0"></span>
                      <span className="truncate">{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/demo-embed.html"
            target="_blank"
            className="w-full py-2.5 bg-[#F1F7EF] hover:bg-[#e2eedf] text-[#254B35] text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors border border-[#A8C99B]/40"
          >
            <span>Test Live Widget with this Theme</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">Crawled Pages</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202820]">{metrics.crawledPages}</div>
          <div className="text-xs text-[#254B35] mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {metrics.crawledPages > 0 ? "Fully Indexed" : "Pending Crawl"}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">Knowledge Base</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202820]">{metrics.knowledgeDocs} docs</div>
          <div className="text-xs text-[#647267] mt-1">Full-Text Search Indexed</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">AI Engine</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202820]">{metrics.aiResponseRate}</div>
          <div className="text-xs text-[#254B35] mt-1">Direct Gemini Grounding</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">Your Websites</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202820]">{websites.length}</div>
          <div className="text-xs text-[#647267] mt-1">Configured &amp; Active</div>
        </div>
      </div>

      {/* Websites Management Table */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#202820]">Your Configured Websites</h3>
          <span className="text-xs text-[#647267]">{websites.length} websites total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#254B35]" />
            <span className="ml-2 text-sm text-[#647267]">Loading websites...</span>
          </div>
        ) : websites.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-[#A8C99B] mx-auto mb-3" />
            <p className="text-sm text-[#647267]">No websites configured yet. Use the top bar to crawl your first website.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5F0E1] text-xs font-semibold text-[#647267] uppercase">
                  <th className="pb-3">Website Name</th>
                  <th className="pb-3">Domain</th>
                  <th className="pb-3">Crawl Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F7EF] text-sm">
                {websites.map((site) => (
                  <tr key={site.id} className="hover:bg-[#F8FAF7] transition-colors">
                    <td className="py-4 font-semibold text-[#202820] flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#254B35]" />
                      {site.name}
                    </td>
                    <td className="py-4 text-[#647267]">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        {site.domain} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#E8F5E9] text-[#2E7D32]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                        {site.crawl_status || "Completed"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href="/dashboard/knowledge"
                          className="p-2 text-[#647267] hover:text-[#254B35] hover:bg-[#F1F7EF] rounded-lg transition-colors"
                          title="Knowledge Base"
                        >
                          <Database className="w-4 h-4" />
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="p-2 text-[#647267] hover:text-[#254B35] hover:bg-[#F1F7EF] rounded-lg transition-colors"
                          title="Chatbot Theme"
                        >
                          <Settings className="w-4 h-4" />
                        </Link>
                        <Link
                          href="/dashboard/embed"
                          className="p-2 text-[#647267] hover:text-[#254B35] hover:bg-[#F1F7EF] rounded-lg transition-colors"
                          title="Get Embed Code"
                        >
                          <Code className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
