"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Check,
  X,
  Mail,
  KeyRound,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  fetchAdminRequests,
  reviewRequest,
  updateClientRequest,
  deleteRequest,
  resetClientAccessCode,
} from "@/api/saasApi";

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

function generateEncryptedCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let result = "CR-";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // 19 characters (fits 15-22 rule)
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Approval Modal State
  const [selectedReq, setSelectedReq] = useState<ClientRequest | null>(null);
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [credentialsBanner, setCredentialsBanner] = useState<{
    email: string;
    username: string;
    accessCode: string;
    title?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset Access Code State
  const [isResetting, setIsResetting] = useState(false);

  // Edit Request State
  const [editingReq, setEditingReq] = useState<ClientRequest | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [editStatus, setEditStatus] = useState<RequestStatus>("pending");
  const [isUpdating, setIsUpdating] = useState(false);

  const openEditModal = (req: ClientRequest) => {
    setEditingReq(req);
    setEditBusinessName(req.businessName);
    setEditContactName(req.contactName);
    setEditEmail(req.email);
    setEditWebsiteUrl(req.websiteUrl);
    setEditStatus(req.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    setIsUpdating(true);
    setError("");

    try {
      await updateClientRequest(editingReq.id, {
        businessName: editBusinessName.trim(),
        contactName: editContactName.trim(),
        email: editEmail.trim(),
        websiteUrl: editWebsiteUrl.trim(),
        status: editStatus,
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === editingReq.id
            ? {
                ...r,
                businessName: editBusinessName.trim(),
                contactName: editContactName.trim(),
                email: editEmail.trim(),
                websiteUrl: editWebsiteUrl.trim(),
                status: editStatus,
              }
            : r
        )
      );

      setEditingReq(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client request.");
    } finally {
      setIsUpdating(false);
    }
  };

  const loadRequests = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchAdminRequests();
      if (Array.isArray(data)) {
        const mapped: ClientRequest[] = data.map((r: any) => ({
          id: r.id,
          businessName: r.businessName || "Unnamed Business",
          contactName: r.contactName || "Contact",
          email: r.email,
          websiteUrl: r.websiteUrl,
          submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "Recent",
          status:
            r.status === "approved" || r.status === "accepted"
              ? "accepted"
              : r.status === "rejected"
              ? "rejected"
              : "pending",
        }));
        setRequests(mapped);
      } else {
        setRequests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests from server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openApproveModal = (req: ClientRequest) => {
    setSelectedReq(req);
    setGeneratedUsername(
      req.businessName.toLowerCase().replace(/[^a-z0-9]/g, "_")
    );
    setGeneratedCode(generateEncryptedCode());
  };

  const handleConfirmApprove = async () => {
    if (!selectedReq) return;
    setIsSending(true);
    setError("");

    try {
      let resultUsername = generatedUsername;
      let resultCode = generatedCode;

      if (!selectedReq.id.startsWith("REQ-")) {
        const res = await reviewRequest(selectedReq.id, "approve");
        if (res?.username) resultUsername = res.username;
        if (res?.accessCode) resultCode = res.accessCode;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedReq.id ? { ...r, status: "accepted" } : r
        )
      );

      setCredentialsBanner({
        title: "Account Provisioned Successfully!",
        email: selectedReq.email,
        username: resultUsername,
        accessCode: resultCode,
      });

      setSelectedReq(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request.");
    } finally {
      setIsSending(false);
    }
  };

  const handleReject = async (id: string) => {
    setError("");
    try {
      if (!id.startsWith("REQ-")) {
        await reviewRequest(id, "reject");
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    setError("");
    try {
      if (!id.startsWith("REQ-")) {
        await deleteRequest(id);
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete request.");
    }
  };

  const handleResetAccessCode = async (req: ClientRequest) => {
    setIsResetting(true);
    setError("");
    try {
      const res = await resetClientAccessCode(req.email);
      setCredentialsBanner({
        title: `New Access Code Generated for ${req.businessName}!`,
        email: res.email,
        username: res.username,
        accessCode: res.accessCode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset access code.");
    } finally {
      setIsResetting(false);
    }
  };

  const copyCredentials = () => {
    if (!credentialsBanner) return;
    const text = `SupportAI Client Access:\nUsername: ${credentialsBanner.username}\nAccess Code: ${credentialsBanner.accessCode}\nLogin URL: http://localhost:3000/`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesFilter = filter === "all" || req.status === filter;
    const matchesSearch =
      req.businessName.toLowerCase().includes(search.toLowerCase()) ||
      req.email.toLowerCase().includes(search.toLowerCase()) ||
      req.contactName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#202820]">
            Client Requests
          </h2>
          <p className="text-xs text-[#647267] mt-0.5">
            Review onboarding requests, manage client tokens, and delete outdated entries.
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#254B35] bg-white border border-[#E5F0E1] rounded-xl hover:bg-[#F1F7EF] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Requests
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated / Reset Credentials Banner */}
      {credentialsBanner && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div>
            <div className="flex items-center gap-2 text-green-900 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-green-700" />
              <span>{credentialsBanner.title || "Account Credentials Active"}</span>
            </div>
            <p className="text-xs text-green-800 mt-1">
              Email: <strong>{credentialsBanner.email}</strong> • Username:{" "}
              <strong className="font-mono bg-white/70 px-1.5 py-0.5 rounded">{credentialsBanner.username}</strong> • Access Code:{" "}
              <strong className="font-mono bg-white/70 px-1.5 py-0.5 rounded text-green-950 font-bold">{credentialsBanner.accessCode}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyCredentials}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#254B35] text-white rounded-lg text-xs font-medium hover:bg-[#1e3d2a] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy Details"}
            </button>
            <button
              onClick={() => setCredentialsBanner(null)}
              className="px-3 py-1.5 bg-white text-[#647267] border border-green-200 rounded-lg text-xs font-medium hover:bg-gray-50 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "accepted", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer ${
                filter === tab
                  ? "bg-[#254B35] text-white shadow-sm"
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

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, contact or email..."
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#647267]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#254B35]" />
                    Fetching real client requests from database...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#647267]">
                    No access requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F1F7EF]/40 transition-colors">
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
                        {req.websiteUrl.replace(/^https?:\/\//, "")}
                        <ExternalLink className="w-3 h-3 text-[#647267]" />
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
                      <div className="inline-flex items-center justify-end gap-2">
                        {req.status === "pending" && (
                          <>
                            <button
                              onClick={() => openApproveModal(req)}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#254B35] text-white rounded-full text-xs font-medium hover:bg-[#1e3d2a] cursor-pointer shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve &amp; Mail
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-full text-xs font-medium hover:bg-red-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {req.status === "accepted" && (
                          <button
                            onClick={() => handleResetAccessCode(req)}
                            disabled={isResetting}
                            title="Generate new Access Code for this client"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F1F7EF] text-[#254B35] border border-[#A8C99B] rounded-full text-xs font-medium hover:bg-[#E5F0E1] cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Reset Code
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(req)}
                          title="Edit client details"
                          className="p-1.5 text-[#647267] hover:text-[#254B35] hover:bg-[#F1F7EF] rounded-lg transition-colors cursor-pointer"
                          aria-label="Edit client details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(req.id)}
                          title="Delete this request"
                          className="p-1.5 text-[#647267] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Delete request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve & Send Credentials Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5F0E1] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#202820]">
                Approve &amp; Send Credentials
              </h3>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1 text-[#647267] hover:text-[#202820] cursor-pointer rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#647267]">
              This will approve <strong>{selectedReq.businessName}</strong> and create their Client Account with access code, emailing login details to{" "}
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-medium hover:bg-[#1e3d2a] cursor-pointer disabled:opacity-60 shadow-sm"
              >
                <Mail className="w-4 h-4" />
                {isSending ? "Approving & Sending..." : "Approve & Send Mail"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Client Request Modal */}
      {editingReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5F0E1] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#202820]">
                Edit Client Request
              </h3>
              <button
                onClick={() => setEditingReq(null)}
                className="p-1 text-[#647267] hover:text-[#202820] cursor-pointer rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Website URL
                </label>
                <input
                  type="text"
                  value={editWebsiteUrl}
                  onChange={(e) => setEditWebsiteUrl(e.target.value)}
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#647267]">
                  Request Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as RequestStatus)}
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted / Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingReq(null)}
                  className="px-4 py-2.5 text-xs font-medium text-[#647267] hover:text-[#202820] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-medium hover:bg-[#1e3d2a] cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
