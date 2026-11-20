import React from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";

export default function SignInPage() {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="min-h-screen bg-[#F1F7EF] flex flex-col justify-center items-center p-4 relative font-sans">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-[#254B35] hover:opacity-80 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="mb-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#254B35] flex items-center justify-center text-white mb-2 shadow-md">
          <Bot className="w-7 h-7 text-[#A8C99B]" />
        </div>
        <h1 className="text-2xl font-bold text-[#254B35]">Welcome Back to SupportAI</h1>
        <p className="text-sm text-[#647267] mt-1">Sign in to manage your website chatbots and knowledge base</p>
      </div>

      <div className="shadow-xl rounded-3xl overflow-hidden border border-[#E5F0E1] bg-white p-2">
        {hasClerkKey ? (
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                formButtonPrimary: "bg-[#254B35] hover:bg-[#1E3D2B] text-white",
                card: "shadow-none border-none",
              },
            }}
          />
        ) : (
          <div className="p-8 max-w-sm text-center space-y-4">
            <h2 className="text-lg font-bold text-[#202820]">Clerk API Key Required</h2>
            <p className="text-xs text-[#647267] leading-relaxed">
              Please add your <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">frontend/.env.local</code> to activate live authentication.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-5 py-2.5 bg-[#254B35] text-white text-xs font-semibold rounded-full hover:bg-[#1E3D2B]"
            >
              Continue to Dashboard (Dev Bypass) →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
