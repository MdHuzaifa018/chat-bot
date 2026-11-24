"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Building2,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  fetchUserProfile,
  updateUserProfile,
  type UserProfileData,
} from "../api/saasApi";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountType?: "client" | "admin";
  onProfileUpdated?: (updated: UserProfileData) => void;
}

function generateEncryptedCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let result = "CR-";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ProfileModal({
  isOpen,
  onClose,
  accountType = "client",
  onProfileUpdated,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "security">("general");
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [username, setUsername] = useState("");

  // Security Credentials
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentAccessCode, setCurrentAccessCode] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError("");
    setSuccess("");

    fetchUserProfile(accountType)
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setBusinessName(data.businessName || "");
        setUsername(data.username || "");
      })
      .catch((err) => {
        console.warn("Failed to load user profile:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, accountType]);

  if (!isOpen) return null;

  const isClient = accountType === "client" || profile?.accountType === "client";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please provide a name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!isClient) {
      if (newPassword) {
        if (newPassword.length < 8) {
          setError("New password must be at least 8 characters.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("New password and confirmation do not match.");
          return;
        }
      }
    } else {
      if (newAccessCode) {
        if (newAccessCode.length < 15 || newAccessCode.length > 22) {
          setError("Access code must be between 15 and 22 characters.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      const updated = await updateUserProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        businessName: businessName.trim(),
        ...(isClient
          ? {
              currentAccessCode: currentAccessCode.trim() || undefined,
              newAccessCode: newAccessCode.trim() || undefined,
            }
          : {
              currentPassword: currentPassword || undefined,
              newPassword: newPassword || undefined,
            }),
      });

      setProfile(updated);
      setSuccess("Profile settings successfully updated!");
      onProfileUpdated?.(updated);

      // Clear sensitive fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentAccessCode("");
      setNewAccessCode("");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const fullProfileUrl = isClient ? "/dashboard/profile" : "/admin/profile";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white rounded-3xl border border-[#E5F0E1] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-[#E5F0E1]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#254B35] text-white flex items-center justify-center text-base font-bold uppercase shadow-sm">
              {(name || (isClient ? "Client" : "Admin")).slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="profile-modal-title"
                  className="text-lg font-semibold text-[#202820]"
                >
                  {name || (isClient ? "Client Profile" : "Admin Profile")}
                </h2>
                <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-[#E5F0E1] text-[#254B35]">
                  {isClient ? "Client Workspace" : profile?.role || "Admin"}
                </span>
              </div>
              <p className="text-xs text-[#647267] mt-0.5">{email || "Account Settings"}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#647267] hover:text-[#202820] hover:bg-[#F1F7EF] rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-5 mb-5 border-b border-[#E5F0E1] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-[#254B35] text-white shadow-xs"
                : "bg-[#F1F7EF] text-[#647267] hover:text-[#254B35]"
            }`}
          >
            Personal &amp; Organization
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-[#254B35] text-white shadow-xs"
                : "bg-[#F1F7EF] text-[#647267] hover:text-[#254B35]"
            }`}
          >
            Security &amp; Credentials
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#E5F0E1] border border-[#A8C99B]/50 flex items-start gap-2.5 text-xs text-[#254B35]">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#647267]">
            <Loader2 className="w-6 h-6 animate-spin text-[#254B35]" />
            <span className="text-xs">Loading profile details...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {activeTab === "general" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#202820]">
                    Full Name / Contact
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#202820]">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                    />
                  </div>
                </div>

                {isClient ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#202820]">
                      Business / Organization Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Company Name"
                        className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#202820]">
                      Administrator Role &amp; Permissions
                    </label>
                    <div className="p-3 bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#254B35] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        {profile?.role === "super_admin" ? "Super Administrator" : "Staff Administrator"}
                      </span>
                      <span className="text-[#647267]">Full Access</span>
                    </div>
                  </div>
                )}

                {username && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#647267]">
                      Username / Identifier
                    </label>
                    <input
                      type="text"
                      disabled
                      value={username}
                      className="w-full bg-gray-100 border border-[#E5F0E1] text-[#647267] rounded-xl px-4 py-2.5 text-xs font-mono cursor-not-allowed"
                    />
                  </div>
                )}
              </>
            )}

            {activeTab === "security" && (
              <>
                {isClient ? (
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1] text-xs text-[#647267] space-y-1">
                      <p className="font-semibold text-[#202820] flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-[#254B35]" />
                        Client Access Code
                      </p>
                      <p>
                        Encrypted access code must contain 15 to 22 characters. Leave blank if not updating.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#202820]">
                        Current Access Code
                      </label>
                      <input
                        type={showSecret ? "text" : "password"}
                        value={currentAccessCode}
                        onChange={(e) => setCurrentAccessCode(e.target.value)}
                        placeholder="Enter current access code"
                        className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[#202820]">
                          New Access Code ({newAccessCode.length} chars)
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewAccessCode(generateEncryptedCode())}
                          className="text-xs text-[#254B35] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Auto-Generate
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showSecret ? "text" : "password"}
                          value={newAccessCode}
                          onChange={(e) => setNewAccessCode(e.target.value)}
                          maxLength={22}
                          placeholder="e.g. CR-9824x71aK92M4P1Q"
                          className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-4 pr-10 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-2.5 text-[#647267] hover:text-[#254B35] cursor-pointer"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1] text-xs text-[#647267] space-y-1">
                      <p className="font-semibold text-[#202820] flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-[#254B35]" />
                        Password Security
                      </p>
                      <p>
                        Password must be at least 8 characters. Leave blank if not updating.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#202820]">
                        Current Password
                      </label>
                      <input
                        type={showSecret ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#202820]">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showSecret ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New secure password"
                          className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-2.5 text-[#647267] hover:text-[#254B35] cursor-pointer"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#202820]">
                        Confirm New Password
                      </label>
                      <input
                        type={showSecret ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-3 border-t border-[#E5F0E1] flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href={fullProfileUrl}
                onClick={onClose}
                className="text-xs font-semibold text-[#254B35] hover:underline inline-flex items-center gap-1"
              >
                Go to Dedicated Profile Page <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#647267] hover:bg-[#F1F7EF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-xl text-xs font-semibold hover:bg-[#1e3d2a] transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
