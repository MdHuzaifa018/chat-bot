"use client";

import React, { useState } from "react";
import {
  Search,
  Check,
  X,
  Mail,
  KeyRound,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type RequestStatus = "pending" | "accepted" | "rejected";

interface ClientRequest {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  websiteUrl: string;
  submittedAt: string;
  status: RequestStatus;
}

const initialRequests: ClientRequest[] = [
  {
    id: "REQ-104",
    businessName: "Aroma Roasters",
    contactName: "Rohan Sharma",
    email: "rohan@aromaroasters.in",
    websiteUrl: "https://aromaroasters.in",
    submittedAt: "2 hours ago",
    status: "pending",
  },
  {
    id: "REQ-103",
    businessName: "PixelCraft Studio",
    contactName: "Meera Nair",
    email: "meera@pixelcraft.io",
    websiteUrl: "https://pixelcraft.io",
    submittedAt: "5 hours ago",
    status: "pending",
  },
  {
    id: "REQ-102",
    businessName: "GreenLeaf Organics",
    contactName: "Ankit Verma",
    email: "ankit@greenleaforganics.in",
    websiteUrl: "https://greenleaforganics.in",
    submittedAt: "1 day ago",
    status: "accepted",
  },
  {
    id: "REQ-101",
    businessName: "QuickSpam Deals",
    contactName: "Unknown User",
    email: "promo@quickspam.xyz",
    websiteUrl: "https://quickspam.xyz",
    submittedAt: "2 days ago",
    status: "rejected",
  },
];

function generateEncryptedCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let result = "CR-";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // 19 characters (fits 15-22 char rule)
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>(initialRequests);
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");
  const [search, setSearch] = useState("");

  // Approval Modal State
  const [selectedReq, setSelectedReq] = useState<ClientRequest | null>(null);
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isSending, setIsSending] = useState(false);

  const openApproveModal = (req: ClientRequest) => {
    setSelectedReq(req);
    setGeneratedUsername(
      req.businessName.toLowerCase().replace(/[^a-z0-9]/g, "_")
    );
    setGeneratedCode(generateEncryptedCode());
  };

  const handleConfirmApprove = () => {
    if (!selectedReq) return;
    setIsSending(true);

    // TODO (Backend Team): POST /api/admin/requests/approve
    // Payload: { requestId: selectedReq.id, username: generatedUsername, encryptedCode: generatedCode, email: selectedReq.email }
    setTimeout(() => {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedReq.id ? { ...r, status: "accepted" } : r
        )
      );
      setIsSending(false);
      setSelectedReq(null);
    }, 600);
  };

  const handleReject = (id: string) => {
    // TODO (Backend Team): POST /api/admin/requests/reject { requestId: id }
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
  };

  const filteredRequests = requests.filter((req) => {
    const matchesFilter = filter === "all" || req.status === filter;
    const matchesSearch =
      req.businessName.toLowerCase().includes(search.toLowerCase()) ||
      req.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "accepted", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer ${
                filter === tab
                  ? "bg-[#254B35] text-white"
                  : "bg-white text-[#647267] border border-[#E5F0E1] hover:text-[#254B35]"
              }`}
            >
              {tab} (
              {tab === "all"
                ? requests.length
                : requests.filter((r) => r.status === tab).length}
              )
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business or email..."
            className="w-full bg-white border border-[#E5F0E1] rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F7EF] text-xs uppercase text-[#647267]">
              <tr>
                <th className="px-6 py-4 font-semibold">Client / Business</th>
                <th className="px-6 py-4 font-semibold">Website</th>
                <th className="px-6 py-4 font-semibold">Submitted</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5F0E1]">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-[#F1F7EF]/40">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[#202820]">
                      {req.businessName}
                    </p>
                    <p className="text-xs text-[#647267]">
                      {req.contactName} • {req.email}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={req.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-[#254B35] hover:underline inline-flex items-center gap-1"
                    >
                      {req.websiteUrl.replace("https://", "")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-xs text-[#647267]">
                    {req.submittedAt}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        req.status === "accepted"
                          ? "bg-[#E5F0E1] text-[#254B35]"
                          : req.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === "pending" ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openApproveModal(req)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#254B35] text-white rounded-full text-xs font-medium hover:bg-[#1e3d2a] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve &amp; Mail
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-full text-xs font-medium hover:bg-red-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#647267]">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve & Send Credentials Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5F0E1] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#202820]">
                Approve &amp; Send Credentials
              </h3>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1 text-[#647267] hover:text-[#202820] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#647267]">
              This will approve <strong>{selectedReq.businessName}</strong> and email the Client Dashboard link along with these credentials to{" "}
              <span className="text-[#254B35] font-medium">
                {selectedReq.email}
              </span>
              .
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Client Username
                </label>
                <input
                  type="text"
                  value={generatedUsername}
                  onChange={(e) => setGeneratedUsername(e.target.value)}
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#647267]">
                    Encrypted Access Code ({generatedCode.length} chars)
                  </label>
                  <button
                    type="button"
                    onClick={() => setGeneratedCode(generateEncryptedCode())}
                    className="text-xs text-[#254B35] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={generatedCode}
                    onChange={(e) => setGeneratedCode(e.target.value)}
                    maxLength={22}
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2.5 text-xs font-medium text-[#647267] hover:text-[#202820] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={isSending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-medium hover:bg-[#1e3d2a] cursor-pointer disabled:opacity-60"
              >
                <Mail className="w-4 h-4" />
                {isSending ? "Sending Email..." : "Approve & Send Mail"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}