"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Plus,
  RefreshCw,
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  fetchWebsites,
  fetchWebsiteDetails,
  addKnowledgeDoc,
  WebsiteData,
  CrawledPageData,
  KnowledgeDocData,
} from "@/api/saasApi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<"crawled" | "custom">("crawled");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docType, setDocType] = useState<"manual_doc" | "faq">("faq");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [websites, setWebsites] = useState<WebsiteData[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [crawledPages, setCrawledPages] = useState<CrawledPageData[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecrawling, setIsRecrawling] = useState(false);

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    setLoading(true);
    try {
      const sites = await fetchWebsites();
      setWebsites(sites);
      if (sites.length > 0) {
        setSelectedSiteId(sites[0].id);
        await loadSiteData(sites[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadSiteData(siteId: string) {
    try {
      const details = await fetchWebsiteDetails(siteId);
      if (details) {
        setCrawledPages(details.crawledPages || []);
        setKnowledgeDocs(details.knowledgeDocuments || []);
      }
    } catch {
      setCrawledPages([]);
      setKnowledgeDocs([]);
    }
  }

  async function handleSiteChange(siteId: string) {
    setSelectedSiteId(siteId);
    setLoading(true);
    await loadSiteData(siteId);
    setLoading(false);
  }

  async function handleRecrawl() {
    if (!selectedSiteId || isRecrawling) return;
    setIsRecrawling(true);
    setStatusMsg("Re-crawling website...");
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/websites/${selectedSiteId}/recrawl`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Re-crawl failed");
      const data = await res.json();
      setStatusMsg(`Website re-crawled! ${data.pagesCrawled || 0} pages refreshed.`);
      await loadSiteData(selectedSiteId);
    } catch (err: any) {
      setErrorMsg(err.message || "Re-crawl failed. Is backend running?");
      setStatusMsg(null);
    } finally {
      setIsRecrawling(false);
      setTimeout(() => { setStatusMsg(null); setErrorMsg(null); }, 5000);
    }
  }

  async function handleAddKnowledge(e: React.FormEvent) {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim() || !selectedSiteId) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await addKnowledgeDoc(selectedSiteId, docTitle.trim(), docContent.trim(), docType);
      setIsAddModalOpen(false);
      setDocTitle("");
      setDocContent("");
      setStatusMsg("Knowledge document added and indexed successfully!");
      await loadSiteData(selectedSiteId);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add document. Is backend running?");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Separate crawled_page docs from manual/faq docs
  const manualDocs = knowledgeDocs.filter((d) => d.source_type !== "crawled_page");

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5F0E1] shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-[#202820]">Website Knowledge Base</h2>
          <p className="text-sm text-[#647267] mt-1">
            All AI responses are strictly grounded on these documents using Supabase full-text search.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {websites.length > 1 && (
            <select
              value={selectedSiteId}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="appearance-none bg-[#F1F7EF] border border-[#A8C99B] text-[#254B35] font-semibold text-xs py-2 px-3 pr-8 rounded-full focus:outline-none cursor-pointer"
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleRecrawl}
            disabled={isRecrawling}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#CBD5E1] text-[#202820] rounded-full text-sm font-semibold hover:bg-[#F8FAF7] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#254B35] ${isRecrawling ? "animate-spin" : ""}`} />
            {isRecrawling ? "Re-crawling..." : "Re-crawl Website"}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-full text-sm font-semibold hover:bg-[#1E3D2B] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add FAQ / Document
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-[#A8C99B] text-sm text-[#2E7D32] flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5F0E1] pb-3">
        <button
          onClick={() => setActiveTab("crawled")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "crawled"
              ? "bg-[#254B35] text-white shadow-sm"
              : "text-[#647267] hover:bg-white"
          }`}
        >
          <FileText className="w-4 h-4" /> Crawled Pages ({crawledPages.length})
        </button>
        <button
          onClick={() => setActiveTab("custom")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "custom"
              ? "bg-[#254B35] text-white shadow-sm"
              : "text-[#647267] hover:bg-white"
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Custom FAQs & Docs ({manualDocs.length})
        </button>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#254B35]" />
            <span className="ml-2 text-sm text-[#647267]">Loading knowledge base...</span>
          </div>
        ) : activeTab === "crawled" ? (
          crawledPages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E5F0E1]">
              <FileText className="w-10 h-10 text-[#A8C99B] mx-auto mb-3" />
              <p className="text-sm text-[#647267]">No crawled pages yet. Add a website and crawl it first.</p>
            </div>
          ) : (
            crawledPages.map((page) => (
              <div
                key={page.id}
                className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm hover:border-[#A8C99B] transition-all"
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#F1F7EF] text-[#254B35] font-semibold">
                      {page.path}
                    </span>
                    <h4 className="font-bold text-[#202820] text-base">{page.title}</h4>
                  </div>
                  <span className="text-xs text-[#647267] flex-shrink-0">
                    {page.created_at ? new Date(page.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <p className="text-sm text-[#647267] leading-relaxed line-clamp-3 bg-[#F8FAF7] p-3 rounded-xl border border-[#F1F7EF]">
                  {page.description || page.url}
                </p>
              </div>
            ))
          )
        ) : manualDocs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5F0E1]">
            <HelpCircle className="w-10 h-10 text-[#A8C99B] mx-auto mb-3" />
            <p className="text-sm text-[#647267]">No custom documents or FAQs yet. Click &quot;Add FAQ / Document&quot; to add one.</p>
          </div>
        ) : (
          manualDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm hover:border-[#A8C99B] transition-all"
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E5F0E1] text-[#254B35] font-semibold uppercase">
                    {doc.source_type}
                  </span>
                  <h4 className="font-bold text-[#202820] text-base">{doc.title}</h4>
                </div>
                <span className="text-xs text-[#647267] flex-shrink-0">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Custom FAQ Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-[#E5F0E1] relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-[#202820] mb-2">Add FAQ / Policy Document</h3>
            <p className="text-sm text-[#647267] mb-6">
              Give your AI chatbot extra context that might not be on public pages.
            </p>

            <form onSubmit={handleAddKnowledge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                  Document Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#202820] cursor-pointer">
                    <input
                      type="radio"
                      name="docType"
                      checked={docType === "faq"}
                      onChange={() => setDocType("faq")}
                    />
                    FAQ (Question & Answer)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#202820] cursor-pointer">
                    <input
                      type="radio"
                      name="docType"
                      checked={docType === "manual_doc"}
                      onChange={() => setDocType("manual_doc")}
                    />
                    Policy / Article
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                  Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Return Policy, Pricing FAQ"
                  className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#254B35] text-sm text-[#202820]"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#647267] uppercase mb-1.5">
                  Content / Answer *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Provide detailed facts and policies..."
                  className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#254B35] text-sm text-[#202820]"
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#CBD5E1] text-sm font-semibold text-[#647267] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#254B35] text-white text-sm font-semibold hover:bg-[#1E3D2B] transition-all shadow"
                >
                  {isSubmitting ? "Saving..." : "Save to Knowledge Base"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
