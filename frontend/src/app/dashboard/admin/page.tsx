"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  Globe,
  Bot,
  MessageSquare,
  Activity,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { fetchAdminOverview } from "@/api/saasApi";

export default function SuperAdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetchAdminOverview();
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  const stats = data?.stats || {
    totalUsers: 1,
    totalWebsites: 1,
    totalChatbots: 1,
    totalConversations: 0,
    geminiStatus: "Connected",
    geminiModel: "gemini-3.5-flash",
  };

  return (
    <div className="space-y-8">
      {/* Super Admin Top Badge & Banner */}
      <div className="bg-[#202820] text-white p-8 rounded-3xl border border-[#254B35] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#A8C99B]/15 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A8C99B]/20 text-[#A8C99B] text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4" /> Super Admin Control Center
            </div>
            <h2 className="text-3xl font-light tracking-tight">
              Platform Master <span className="font-bold text-[#A8C99B]">Overview</span>
            </h2>
            <p className="text-sm text-gray-300 mt-2 max-w-xl leading-relaxed">
              Yahan aap poore SupportAI SaaS platform ke saare registered clients, unki websites, chat traffic aur AI engine status dekh sakte hain.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#254B35] hover:bg-[#2d583e] text-white text-xs font-semibold rounded-full border border-[#A8C99B]/40 transition-all shadow"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Platform Data
          </button>
        </div>
      </div>

      {/* Role Explanation Card (Easy Words) */}
      <div className="bg-[#F1F7EF] border border-[#A8C99B] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#254B35] text-[#A8C99B] flex items-center justify-center font-bold">
            👑
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#254B35]">Platform Access Level: Super Admin</h4>
            <p className="text-xs text-[#647267] mt-0.5">
              Normal Clients sirf apna dashboard dekh sakte hain. Super Admin ko platform ke saare users aur websites ka complete access hota hai.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-white border border-[#A8C99B] text-xs font-bold text-[#254B35] rounded-full">
          Super Admin Active
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">Total Clients</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202820]">{stats.totalUsers}</div>
          <div className="text-xs text-[#254B35] mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Registered Accounts
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">Total Websites</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202820]">{stats.totalWebsites}</div>
          <div className="text-xs text-[#647267] mt-1">Across all clients</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">Active Chatbots</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202820]">{stats.totalChatbots}</div>
          <div className="text-xs text-[#254B35] mt-1">1-Line Embeds Ready</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#647267] uppercase">Gemini Engine</span>
            <div className="p-2 rounded-xl bg-[#F1F7EF] text-[#254B35]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-[#202820] truncate">{stats.geminiModel}</div>
          <div className="text-xs text-[#254B35] mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {stats.geminiStatus}
          </div>
        </div>
      </div>

      {/* Platform Websites Table */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#202820]">All Platform Websites &amp; Tenants</h3>
          <span className="text-xs text-[#647267]">{data?.websites?.length || 0} websites total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#254B35]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5F0E1] text-xs font-semibold text-[#647267] uppercase">
                  <th className="pb-3">Website</th>
                  <th className="pb-3">Domain</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F7EF]">
                {(data?.websites || []).map((w: any) => (
                  <tr key={w.id} className="hover:bg-[#F8FAF7]">
                    <td className="py-4 font-semibold text-[#202820] flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#254B35]" />
                      {w.name}
                    </td>
                    <td className="py-4 text-[#647267]">
                      <a href={w.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        {w.domain} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                        {w.crawl_status || "completed"}
                      </span>
                    </td>
                    <td className="py-4 text-xs text-[#647267]">
                      {w.created_at ? new Date(w.created_at).toLocaleDateString() : "Active"}
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
