"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Shield,
  KeyRound,
  LayoutDashboard,
  Check,
} from "lucide-react";
import {
  fetchUserProfile,
  updateUserProfile,
  type UserProfileData,
} from "@/api/saasApi";

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchUserProfile("admin")
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
      })
      .catch((err) => {
        console.warn("Could not load admin profile:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please provide an administrator name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirm password do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateUserProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      setProfile(updated);
      setSuccess("Administrator profile and credentials updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to update admin profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#647267] mb-1">
            <Link href="/admin" className="hover:text-[#254B35] transition-colors">
              Admin Console
            </Link>
            <span>/</span>
            <span className="text-[#254B35] font-semibold">Profile Settings</span>
          </div>
          <h2 className="text-2xl font-bold text-[#202820]">Administrator Profile &amp; Security</h2>
          <p className="text-sm text-[#647267]">
            Manage your Curious Rabit admin identity, credentials, and elevated privileges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#254B35] border border-[#E5F0E1] rounded-full text-xs font-semibold hover:bg-[#F1F7EF] transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Overview &amp; Telemetry
          </Link>
        </div>
      </div>

      {/* Admin Overview Banner */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#254B35] text-white flex items-center justify-center text-xl font-bold uppercase shadow-sm">
            {(name || "Admin").slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#202820]">{name || "Administrator"}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-semibold uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {profile?.role === "super_admin" ? "Super Admin" : "Team Member"}
              </span>
            </div>
            <p className="text-xs text-[#647267] mt-0.5">{email || "admin@curiousrabit.online"}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F1F7EF] text-[#254B35] font-medium">
                Requests &amp; Approvals
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F1F7EF] text-[#254B35] font-medium">
                Telemetry &amp; Metrics
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F1F7EF] text-[#254B35] font-medium">
                Team Management
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#647267] bg-[#F1F7EF] px-4 py-2.5 rounded-2xl border border-[#E5F0E1]">
          <span>Session Lifetime: </span>
          <strong className="text-[#202820]">7 Days Active</strong>
        </div>
      </div>

      {/* Alerts */}
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
          <span className="text-sm">Loading administrator profile...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Identity Form */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-[#E5F0E1] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-[#E5F0E1]">
              <User className="w-5 h-5 text-[#254B35]" />
              <h3 className="text-base font-bold text-[#202820]">Administrator Identity</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Administrator Name"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@curiousrabit.online"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1] space-y-2 text-xs">
                <span className="font-semibold text-[#202820] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#254B35]" /> Role Privileges
                </span>
                <p className="text-[#647267]">
                  As a Super Administrator, you have full permissions to review client access requests, generate access credentials, monitor telemetry, and configure system settings.
                </p>
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

          {/* Password Security Form */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-[#E5F0E1] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-[#E5F0E1]">
              <Lock className="w-5 h-5 text-[#254B35]" />
              <h3 className="text-base font-bold text-[#202820]">Change Password</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#202820]">New Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#254B35] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202820]">Confirm New Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5F0E1] text-xs text-[#647267] space-y-1">
              <span className="font-semibold text-[#202820] block">Security Best Practices</span>
              <p>
                Use a strong combination of uppercase, lowercase letters, numbers, and special symbols. Never share your Curious Rabit administrative credentials.
              </p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
