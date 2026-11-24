"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Building2,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RefreshCw,
  Copy,
  Check,
  ArrowLeft,
  Sliders,
  ExternalLink,
} from "lucide-react";
import {
  fetchUserProfile,
  updateUserProfile,
  type UserProfileData,
} from "@/api/saasApi";

function generateEncryptedCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let result = "CR-";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ClientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [username, setUsername] = useState("");

  // Access Code Fields
  const [currentAccessCode, setCurrentAccessCode] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchUserProfile("client")
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setBusinessName(data.businessName || "");
        setUsername(data.username || "");
      })
      .catch((err) => {
        console.warn("Could not load client profile:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please provide your name or business contact.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (newAccessCode) {
      if (newAccessCode.length < 15 || newAccessCode.length > 22) {
        setError("Encrypted access code must be between 15 and 22 characters.");
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateUserProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        businessName: businessName.trim(),
        currentAccessCode: currentAccessCode.trim() || undefined,
        newAccessCode: newAccessCode.trim() || undefined,
      });

      setProfile(updated);
      setSuccess("Profile settings successfully updated!");
      setCurrentAccessCode("");
      setNewAccessCode("");

      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#647267] mb-1">
            <Link href="/dashboard" className="hover:text-[#254B35] transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#254B35] font-semibold">Profile Settings</span>
          </div>
          <h2 className="text-2xl font-bold text-[#202820]">Client Account &amp; Profile</h2>
          <p className="text-sm text-[#647267]">
            Manage your organization profile, contact email, and secure access code credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#254B35] border border-[#E5F0E1] rounded-full text-xs font-semibold hover:bg-[#F1F7EF] transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" /> Chatbot Settings
          </Link>
        </div>
      </div>

      {/* Account Overview Card */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#254B35] text-white flex items-center justify-center text-xl font-bold uppercase shadow-sm">
            {(name || "Client").slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#202820]">{businessName || name || "Client Workspace"}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-semibold uppercase">
                Active Client
              </span>
            </div>
            <p className="text-xs text-[#647267] mt-0.5">{email || "client@supportai.local"}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#647267]">
              <span>
                Username: <strong className="text-[#202820] font-mono">{username || "client_workspace"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#254B35] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> 256-bit Code Authentication
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={() => {
              if (username) handleCopyCode(username);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F1F7EF] text-[#254B35] hover:bg-[#E5F0E1] transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? "Copied!" : "Copy Username"}
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-[#E5F0E1] border border-[#A8C99B] flex items-start gap-3 text-sm text-[#254B35]">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl border border-[#E5F0E1] p-12 flex flex-col items-center justify-center gap-3 text-[#647267]">
          <Loader2 className="w-8 h-8 animate-spin text-[#254B35]" />
          <span className="text-sm">Loading your profile information...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Organization & Contact Info */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E5F0E1] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-[#E5F0E1]">
              <Building2 className="w-5 h-5 text-[#254B35]" />
              <h3 className="text-base font-bold text-[#202820]">Organization &amp; Contact Details</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Business / Company Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Primary Contact Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Work Notification Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
                <p className="text-[11px] text-[#647267]">
                  New client inquiries and system reports will be sent to this email.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#647267]">Client Username (System Assigned)</label>
                <input
                  type="text"
                  disabled
                  value={username}
                  className="w-full bg-gray-100 border border-[#E5F0E1] text-[#647267] rounded-xl px-4 py-3 text-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5F0E1] flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#254B35] text-white rounded-full text-sm font-semibold hover:bg-[#1e3d2a] transition-all shadow-md disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Profile
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Encrypted Access Code Management */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E5F0E1] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-[#E5F0E1]">
              <KeyRound className="w-5 h-5 text-[#254B35]" />
              <h3 className="text-base font-bold text-[#202820]">Encrypted Access Code</h3>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1] space-y-2 text-xs text-[#647267]">
              <p className="font-semibold text-[#202820] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#254B35]" /> Passwordless Key Authentication
              </p>
              <p className="leading-relaxed">
                Your account is protected by an encrypted access token consisting of 15 to 22 characters. Keep it secure and private.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Current Access Code</label>
                <input
                  type={showCode ? "text" : "password"}
                  value={currentAccessCode}
                  onChange={(e) => setCurrentAccessCode(e.target.value)}
                  placeholder="Enter current code to authorize change"
                  className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#202820]">
                    New Access Code ({newAccessCode.length}/22)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewAccessCode(generateEncryptedCode())}
                    className="text-xs text-[#254B35] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCode ? "text" : "password"}
                    value={newAccessCode}
                    onChange={(e) => setNewAccessCode(e.target.value)}
                    maxLength={22}
                    placeholder="CR-xxxx..."
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-4 pr-10 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-3.5 top-3.5 text-[#647267] hover:text-[#254B35] cursor-pointer"
                  >
                    {showCode ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#E5F0E1]/50 border border-[#A8C99B]/40 text-xs text-[#254B35] space-y-1">
              <span className="font-semibold block">Need to reset your access code?</span>
              <p>
                Updating this code will require you to sign in with the new code on your next browser session.
              </p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
