"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInClient } from "@/api/saasApi";
import {
  Bot,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function ClientLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [encryptedCode, setEncryptedCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const codeLength = encryptedCode.length;
  const isCodeValid = codeLength >= 15 && codeLength <= 22;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (!isCodeValid) {
      setError("Encrypted access code must be between 15 and 22 characters.");
      return;
    }

    setIsLoading(true);

    try {
      await signInClient(username.trim(), encryptedCode.trim());
      router.replace("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F7EF] flex flex-col justify-center items-center p-6 selection:bg-[#A8C99B] selection:text-[#254B35]">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-[#254B35] flex items-center justify-center text-white shadow-md">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <span className="text-2xl font-semibold tracking-tight text-[#254B35] block leading-none">
            SupportAI
          </span>
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#647267]">
            Curious Rabit Solutions
          </span>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5F0E1] shadow-xl p-8 md:p-10">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-semibold uppercase tracking-wide mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Client Access
          </span>
          <h1 className="text-2xl font-semibold text-[#202820]">
            Sign in to Your Dashboard
          </h1>
          <p className="text-sm text-[#647267] mt-2">
            Use the username and encrypted access code sent to your email.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#202820] block">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your client username"
                className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
            </div>
          </div>

          {/* Encrypted Code (15-22 chars) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#202820]">
                Encrypted Access Code
              </label>
              <span
                className={`text-xs font-medium ${
                  isCodeValid ? "text-[#254B35]" : "text-[#647267]"
                }`}
              >
                {codeLength} / 15–22 chars
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
              <input
                type={showCode ? "text" : "password"}
                value={encryptedCode}
                onChange={(e) => setEncryptedCode(e.target.value)}
                maxLength={22}
                placeholder="Paste your 15–22 character code"
                className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-11 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3.5 top-3 text-[#647267] hover:text-[#254B35] cursor-pointer"
                aria-label="Toggle code visibility"
              >
                {showCode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#254B35] text-white rounded-full text-sm font-medium hover:bg-[#1e3d2a] transition-all shadow-md disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? "Verifying Credentials..." : "Access Dashboard"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>

        </form>
      </div>

      <div className="flex items-center gap-4 mt-6 text-xs text-[#647267]">
        <Link href="/request-access" className="font-semibold text-[#254B35] hover:underline">Request client access</Link>
        <span>•</span>
        <a href="/admin/login" className="font-semibold text-[#254B35] hover:underline">
          Admin / Team Portal →
        </a>
      </div>
    </div>
  );
}
