"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  RotateCcw,
  Trash2,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Sparkles,
  Inbox,
  Globe,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  fetchWebsites,
  fetchWebsiteInquiries,
  deleteWebsiteInquiry,
  type CustomerInquiryItem,
  type WebsiteData,
} from "@/api/saasApi";

export default function CustomerInquiriesPage() {
  const [websites, setWebsites] = useState<WebsiteData[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [inquiries, setInquiries] = useState<CustomerInquiryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "unread">("all");

  // Load client websites
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const sites = await fetchWebsites();
        if (!isMounted) return;
        setWebsites(sites);
        if (sites.length > 0) {
          const initialId = sites[0].id;
          setSelectedWebsiteId(initialId);
          await loadInquiriesForSite(initialId);
        }
      } catch (err) {
        console.error("Failed to load websites for inquiries:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadInquiriesForSite = async (siteId: string) => {
    if (!siteId) return;
    setIsRefreshing(true);
    try {
      const data = await fetchWebsiteInquiries(siteId);
      setInquiries(data);
    } catch (err) {
      console.warn("Failed to fetch inquiries:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectWebsite = async (id: string) => {
    setSelectedWebsiteId(id);
    await loadInquiriesForSite(id);
  };

  const handleDelete = async (inquiryId: string) => {
    if (!selectedWebsiteId) return;
    setDeletingId(inquiryId);
    try {
      await deleteWebsiteInquiry(selectedWebsiteId, inquiryId);
      setInquiries((prev) => prev.filter((item) => item.id !== inquiryId));
    } catch (err) {
      console.warn("Error deleting inquiry:", err);
      // Optimistic update fallback
      setInquiries((prev) => prev.filter((item) => item.id !== inquiryId));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const selectedSite = websites.find((w) => w.id === selectedWebsiteId);

  // Filter inquiries
  const filteredInquiries = inquiries.filter((item) => {
    // Search query filter
    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.message || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "today") {
      const createdDate = new Date(item.created_at);
      const today = new Date();
      return createdDate.toDateString() === today.toDateString();
    }
    return true;
  });

  const todayCount = inquiries.filter((item) => {
    const createdDate = new Date(item.created_at);
    const today = new Date();
    return createdDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E5F0E1] text-[#254B35]">
              Real-time Inbound
            </span>
            <span className="text-xs text-[#647267]">• Updated live</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202820] mt-1">
            Customer Queries &amp; Inquiries
          </h1>
          <p className="text-sm text-[#647267]">
            All custom questions and contact inquiries submitted by visitors through your chatbot widget.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {websites.length > 1 && (
            <div className="relative">
              <select
                value={selectedWebsiteId}
                onChange={(e) => handleSelectWebsite(e.target.value)}
                className="appearance-none bg-white border border-[#E5F0E1] text-xs font-medium text-[#202820] rounded-xl px-3 py-2.5 pr-8 focus:outline-none cursor-pointer"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || w.domain || w.url}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#647267] absolute right-2.5 top-3 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => loadInquiriesForSite(selectedWebsiteId)}
            disabled={isRefreshing || !selectedWebsiteId}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E5F0E1] hover:bg-[#F1F7EF] text-[#254B35] rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Queries"}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5F0E1] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#647267]">Total Queries Received</span>
            <h3 className="text-2xl font-bold text-[#202820] mt-0.5">{inquiries.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E5F0E1] flex items-center justify-center text-[#254B35]">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5F0E1] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#647267]">Received Today</span>
            <h3 className="text-2xl font-bold text-[#202820] mt-0.5">{todayCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E5F0E1] flex items-center justify-center text-[#254B35]">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5F0E1] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#647267]">Chatbot Deployment</span>
            <h3 className="text-xs font-bold text-[#202820] mt-1 truncate max-w-[180px]">
              {selectedSite?.url ? selectedSite.url.replace(/^https?:\/\//, "") : "Active"}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E5F0E1] flex items-center justify-center text-[#254B35]">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-[#E5F0E1]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, email, query..."
              className="w-full bg-[#F1F7EF] border border-[#E5F0E1] text-xs rounded-xl pl-9 pr-4 py-2.5 text-[#202820] placeholder:text-[#647267] focus:outline-none focus:border-[#254B35]"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === "all"
                  ? "bg-[#254B35] text-white"
                  : "bg-[#F1F7EF] text-[#647267] hover:bg-[#E5F0E1]"
              }`}
            >
              All ({inquiries.length})
            </button>
            <button
              onClick={() => setActiveFilter("today")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === "today"
                  ? "bg-[#254B35] text-white"
                  : "bg-[#F1F7EF] text-[#647267] hover:bg-[#E5F0E1]"
              }`}
            >
              Today ({todayCount})
            </button>
          </div>
        </div>

        {/* List of Inquiries */}
        {isLoading ? (
          <div className="py-16 text-center text-[#647267]">
            <div className="w-6 h-6 border-2 border-[#254B35] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading customer inquiries...</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F7EF] border border-[#E5F0E1] flex items-center justify-center text-[#254B35] mx-auto shadow-inner">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#202820]">
                {searchQuery ? "No matching inquiries found" : "No Customer Queries Yet"}
              </h3>
              <p className="text-xs text-[#647267] mt-1 leading-relaxed">
                {searchQuery
                  ? "Try adjusting your search terms or filters."
                  : "When visitors click 'Ask Custom Question / Submit Query' on your chatbot widget, their queries, contact info, and timestamps will appear here in real time."}
              </p>
            </div>
            {!searchQuery && (
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#254B35] text-white text-xs font-medium rounded-xl hover:bg-[#1b3727] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Go to Chatbot Settings &amp; Test Live Widget</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((item) => {
              const formattedDate = new Date(item.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              const replySubject = encodeURIComponent(`Re: ${item.subject || "Your Support Inquiry"}`);
              const replyBody = encodeURIComponent(
                `Hi ${item.name || "there"},\n\nThank you for reaching out through our chatbot. Regarding your query:\n"${item.message}"\n\n`
              );
              const mailtoUrl = `mailto:${item.email}?subject=${replySubject}&body=${replyBody}`;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#FBFDFB] border border-[#E5F0E1] hover:border-[#254B35]/30 transition-all space-y-4 shadow-sm"
                >
                  {/* Top Bar: Contact Info & Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#254B35] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {(item.name || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-[#202820]">
                            {item.name || "Anonymous Visitor"}
                          </h4>
                          {item.subject && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E5F0E1] text-[#254B35]">
                              {item.subject}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#647267] mt-0.5">
                          <span>{item.email}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(item.email, item.id)}
                            className="p-1 hover:text-[#254B35] transition-colors cursor-pointer"
                            title="Copy Email"
                          >
                            {copiedEmailId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[#647267]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="bg-white rounded-xl border border-[#E5F0E1] p-4 text-xs text-[#202820] leading-relaxed">
                    <span className="font-semibold text-[#647267] block mb-1">Customer Query:</span>
                    <p className="whitespace-pre-wrap">{item.message}</p>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={mailtoUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#254B35] hover:bg-[#1b3727] text-white text-xs font-medium transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Reply via Email</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete inquiry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingId === item.id ? "Deleting..." : "Delete"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
