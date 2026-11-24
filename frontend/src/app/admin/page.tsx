"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Activity,
  Clock,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  Server,
  MessageSquare,
} from "lucide-react";

const activeWebsites = [
  {
    id: "1",
    name: "GreenLeaf Organics",
    url: "https://greenleaforganics.in",
    latency: "142 ms",
    dailyChats: 412,
    status: "Healthy",
  },
  {
    id: "2",
    name: "UrbanDesk Furniture",
    url: "https://urbandesk.co",
    latency: "168 ms",
    dailyChats: 289,
    status: "Healthy",
  },
  {
    id: "3",
    name: "SwiftPay Logistics",
    url: "https://swiftpaylogistics.com",
    latency: "310 ms",
    dailyChats: 840,
    status: "High Load",
  },
  {
    id: "4",
    name: "NovaSkin Studio",
    url: "https://novaskin.store",
    latency: "129 ms",
    dailyChats: 154,
    status: "Healthy",
  },
];

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState({
    totalWebsites: 48,
    totalChatbots: 48,
    totalConversations: 1420,
    geminiStatus: "Connected",
    geminiModel: "gemini-3.5-flash-lite",
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/overview")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setMetrics((prev) => ({
            ...prev,
            totalWebsites: json.data.totalWebsites || prev.totalWebsites,
            totalChatbots: json.data.totalChatbots || prev.totalChatbots,
            totalConversations: json.data.totalConversations || prev.totalConversations,
            geminiStatus: json.data.geminiStatus || prev.geminiStatus,
            geminiModel: json.data.geminiModel || prev.geminiModel,
          }));
        }
      })
      .catch(() => {});
  }, []);
  return (
    <div className="space-y-8">
      {/* Top KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#254B35] bg-[#E5F0E1] px-2.5 py-1 rounded-full">
              +6 this week
            </span>
          </div>
          <p className="text-xs font-medium text-[#647267]">Active Websites</p>
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">{metrics.totalWebsites}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#254B35] bg-[#E5F0E1] px-2.5 py-1 rounded-full">
              Optimal
            </span>
          </div>
          <p className="text-xs font-medium text-[#647267]">Avg. AI Latency</p>
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">164 ms</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
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
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">7</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5F0E1] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-[#647267]">All time</span>
          </div>
          <p className="text-xs font-medium text-[#647267]">Rejected Requests</p>
          <h3 className="text-3xl font-semibold text-[#202820] mt-1">12</h3>
        </div>
      </div>

      {/* System Health Strip */}
      <div className="bg-[#254B35] text-white rounded-3xl p-6 sm:p-8 grid sm:grid-cols-3 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-[#A8C99B]" />
          </div>
          <div>
            <p className="text-xs text-[#E5F0E1]/80">API Uptime (30d)</p>
            <p className="text-xl font-semibold">99.94%</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#A8C99B]" />
          </div>
          <div>
            <p className="text-xs text-[#E5F0E1]/80">Messages Handled Today</p>
            <p className="text-xl font-semibold">14,820</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#A8C99B]" />
          </div>
          <div>
            <p className="text-xs text-[#E5F0E1]/80">Gemini AI Model</p>
            <p className="text-sm font-semibold font-mono text-green-200">{metrics.geminiModel}</p>
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
              Live embed status and response latency per client site.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F7EF] text-xs uppercase text-[#647267]">
              <tr>
                <th className="px-6 py-4 font-semibold">Business</th>
                <th className="px-6 py-4 font-semibold">Website URL</th>
                <th className="px-6 py-4 font-semibold">Avg. Latency</th>
                <th className="px-6 py-4 font-semibold">Chats / Day</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5F0E1]">
              {activeWebsites.map((site) => (
                <tr key={site.id} className="hover:bg-[#F1F7EF]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#202820]">
                    {site.name}
                  </td>
                  <td className="px-6 py-4 text-[#647267] font-mono text-xs">
                    {site.url}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#202820]">
                    {site.latency}
                  </td>
                  <td className="px-6 py-4 text-[#202820]">{site.dailyChats}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        site.status === "Healthy"
                          ? "bg-[#E5F0E1] text-[#254B35]"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {site.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}