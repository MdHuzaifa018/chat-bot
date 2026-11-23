"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Users,
  Clock,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  Server,
  MessageSquare,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { fetchAdminOverview } from "@/api/saasApi";

interface WebsiteItem {
  id: string;
  name: string;
  url: string;
  domain?: string;
  crawl_status?: string;
  created_at?: string;
  last_crawled_at?: string;
}

interface AdminMetrics {
  totalUsers: number;
  totalWebsites: number;
  totalChatbots: number;
  totalConversations: number;
  totalMessages: number;
  pendingRequests: number;
  rejectedRequests: number;
  acceptedRequests: number;
  totalRequests: number;
  websitesThisWeek: number;
  geminiStatus: string;
  geminiModel: string;
  uptimeSeconds: number;
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalUsers: 0,
    totalWebsites: 0,
    totalChatbots: 0,
    totalConversations: 0,
    totalMessages: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
    acceptedRequests: 0,
    totalRequests: 0,
    websitesThisWeek: 0,
    geminiStatus: "Checking...",
    geminiModel: "gemini-3.5-flash-lite",
    uptimeSeconds: 0,
  });

  const [websites, setWebsites] = useState<WebsiteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetchAdminOverview();
      if (res?.stats) {
        setMetrics({
          totalUsers: Number(res.stats.totalUsers ?? 0),
          totalWebsites: Number(res.stats.totalWebsites ?? 0),
          totalChatbots: Number(res.stats.totalChatbots ?? 0),
          totalConversations: Number(res.stats.totalConversations ?? 0),
          totalMessages: Number(res.stats.totalMessages ?? 0),
          pendingRequests: Number(res.stats.pendingRequests ?? 0),
          rejectedRequests: Number(res.stats.rejectedRequests ?? 0),
          acceptedRequests: Number(res.stats.acceptedRequests ?? 0),
          totalRequests: Number(res.stats.totalRequests ?? 0),
          websitesThisWeek: Number(res.stats.websitesThisWeek ?? 0),
          geminiStatus: res.stats.geminiStatus || "Connected",
          geminiModel: res.stats.geminiModel || "gemini-3.5-flash-lite",
          uptimeSeconds: Number(res.stats.uptimeSeconds ?? 0),
        });
      }

      if (Array.isArray(res?.websites)) {
        setWebsites(res.websites);
      } else {
        setWebsites([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin overview.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return "Operational (100%)";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m active`;
    return `${mins}m active`;
  };

  return (
    <div className="space-y-8">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#202820]">
            Admin Overview
          </h2>
          <p className="text-xs text-[#647267] mt-0.5">
            Real-time platform telemetry, chatbot performance &amp; client activity.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#254B35] bg-white border border-[#E5F0E1] rounded-xl hover:bg-[#F1F7EF] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Top KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Websites */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#254B35] bg-[#E5F0E1] px-2.5 py-1 rounded-full">
              {metrics.websitesThisWeek > 0 ? `+${metrics.websitesThisWeek} this week` : "Live"}
            </span>
          </div>
          <p className="text-xs font-medium text-[#647267]">Active Websites</p>
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">
            {isLoading ? "..." : metrics.totalWebsites}
          </h3>
        </div>

        {/* Registered Clients */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#254B35] bg-[#E5F0E1] px-2.5 py-1 rounded-full">
              {metrics.totalUsers} Onboarded
            </span>
          </div>
          <p className="text-xs font-medium text-[#647267]">Client Accounts</p>
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">
            {isLoading ? "..." : metrics.totalUsers}
          </h3>
        </div>

        {/* Pending Requests */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <Link
              href="/admin/requests"
              className="text-xs font-medium text-[#254B35] hover:underline flex items-center gap-0.5"
            >
              Review <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs font-medium text-[#647267]">Pending Requests</p>
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">
            {isLoading ? "..." : metrics.pendingRequests}
          </h3>
        </div>

        {/* Rejected Requests */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#647267]">
              {metrics.acceptedRequests} accepted
            </span>
          </div>
          <p className="text-xs font-medium text-[#647267]">Rejected Requests</p>
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">
            {isLoading ? "..." : metrics.rejectedRequests}
          </h3>
        </div>
      </div>

      {/* System Health Strip (Dark Green Banner) */}
      <div className="bg-[#254B35] text-white rounded-3xl p-6 sm:p-8 grid sm:grid-cols-3 gap-6 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-[#A8C99B]" />
          </div>
          <div>
            <p className="text-xs text-[#E5F0E1]/80">API Health &amp; Uptime</p>
            <p className="text-xl font-semibold">{formatUptime(metrics.uptimeSeconds)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#A8C99B]" />
          </div>
          <div>
            <p className="text-xs text-[#E5F0E1]/80">Messages &amp; Chats Handled</p>
            <p className="text-xl font-semibold">
              {isLoading
                ? "..."
                : metrics.totalMessages > 0
                ? metrics.totalMessages.toLocaleString()
                : metrics.totalConversations.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#A8C99B]" />
          </div>
          <div>
            <p className="text-xs text-[#E5F0E1]/80">Gemini AI Model ({metrics.geminiStatus})</p>
            <p className="text-sm font-semibold font-mono text-green-200">
              {metrics.geminiModel}
            </p>
          </div>
        </div>
      </div>

      {/* Active Websites Table */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5F0E1] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#202820]">
              Websites Using SupportAI
            </h2>
            <p className="text-xs text-[#647267]">
              Live client websites registered and managed in Supabase database.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F7EF] text-xs uppercase text-[#647267]">
              <tr>
                <th className="px-6 py-4 font-semibold">Business / Site Name</th>
                <th className="px-6 py-4 font-semibold">Website URL</th>
                <th className="px-6 py-4 font-semibold">Domain</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold">Crawl Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5F0E1]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#647267]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#254B35]" />
                    Loading client websites from database...
                  </td>
                </tr>
              ) : websites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#647267]">
                    No client websites registered yet. Websites added by clients will appear here.
                  </td>
                </tr>
              ) : (
                websites.map((site) => (
                  <tr key={site.id} className="hover:bg-[#F1F7EF]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#202820]">
                      {site.name || site.domain || "Client Website"}
                    </td>
                    <td className="px-6 py-4 text-[#647267] font-mono text-xs">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline hover:text-[#254B35] inline-flex items-center gap-1"
                      >
                        {site.url}
                        <ExternalLink className="w-3 h-3 text-[#647267]" />
                      </a>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#202820]">
                      {site.domain || new URL(site.url || "https://example.com").hostname}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#647267]">
                      {site.created_at ? new Date(site.created_at).toLocaleDateString() : "Active"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          site.crawl_status === "completed"
                            ? "bg-[#E5F0E1] text-[#254B35]"
                            : site.crawl_status === "in_progress"
                            ? "bg-blue-50 text-blue-700"
                            : site.crawl_status === "failed"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {site.crawl_status || "idle"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
