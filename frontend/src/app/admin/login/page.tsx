"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAdmin } from "@/api/saasApi";
import { Bot, Mail, Lock, ArrowRight, Shield, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both your work email and password.");
      return;
    }

    setIsLoading(true);

    try {
      await signInAdmin(email.trim(), password);
      router.replace("/admin");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F7EF] flex flex-col justify-center items-center p-6 text-[#202820]">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-[#254B35] flex items-center justify-center text-white shadow-md">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <span className="text-2xl font-semibold tracking-tight text-[#254B35] block leading-none">
            SupportAI
          </span>
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#647267]">
            Admin &amp; Team Portal
          </span>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5F0E1] shadow-xl p-8 md:p-10">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-semibold uppercase tracking-wide mb-3">
            <Shield className="w-3.5 h-3.5" /> Internal Access
          </span>
          <h1 className="text-2xl font-semibold text-[#202820]">Team Sign In</h1>
          <p className="text-sm text-[#647267] mt-2">
            Sign in with your Curious Rabit work email to access your assigned tools.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#202820] block">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@curiousrabit.online"
                className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#202820] block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#647267] absolute left-4 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#254B35] text-white rounded-full text-sm font-medium hover:bg-[#1e3d2a] transition-all shadow-md disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? "Signing In..." : "Sign In"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>

        </form>
      </div>

      <div className="flex items-center gap-4 mt-6 text-xs text-[#647267]">
        <span>Looking for client dashboard?</span>
        <a href="/" className="font-semibold text-[#254B35] hover:underline">
          Client Login Portal →
        </a>
      </div>
    </div>
  );
}
