"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Code2,
  Copy,
  Check,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { fetchWebsites, fetchWebsiteDetails, API_ORIGIN } from "@/api/saasApi";

export default function SetupCodePage() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"html" | "nextjs" | "cms">("html");
  const [botName, setBotName] = useState("Support Assistant");
  const [isConfigured, setIsConfigured] = useState(false);
  const [botId, setBotId] = useState("");

  useEffect(() => {
    const localBotId = localStorage.getItem("supportai_public_chatbot_id");
    if (localBotId) {
      setBotId(localBotId);
      setIsConfigured(true);
    }

    fetchWebsites().then(async sites => {
      if (!sites.length) return;
      const details = await fetchWebsiteDetails(sites[0].id);
      setBotName(details.chatbotConfig?.chatbot_name || sites[0].name);
      setBotId(details.chatbotConfig?.public_chatbot_id || localBotId || "");
      setIsConfigured(Boolean(details.chatbotConfig?.public_chatbot_id || localBotId));
    }).catch(() => {
      if (!localBotId) setIsConfigured(false);
    });
  }, []);

  const embedScript = `<script
  src="${API_ORIGIN}/widget.js"
  data-chatbot-id="${botId}"
  async
></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#202820]">
            Embed Setup Code
          </h2>
          <p className="text-sm text-[#647267] mt-1">
            Add this single script tag to your website to launch{" "}
            <span className="font-medium text-[#254B35]">{botName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/demo-embed.html?bot=${encodeURIComponent(botId)}&api=${encodeURIComponent(API_ORIGIN)}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-semibold hover:bg-[#1e3d2a] transition-all shadow-sm"
          >
            Test Live Widget ↗
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#254B35] border border-[#E5F0E1] rounded-full text-xs font-medium hover:bg-[#E5F0E1] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
          </Link>
        </div>
      </div>

      {/* Config Status Banner */}
      {isConfigured ? (
        <div className="p-4 rounded-2xl bg-[#E5F0E1] border border-[#A8C99B]/50 flex items-center gap-3 text-sm text-[#254B35]">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            Your chatbot configuration is saved and ready to embed.
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-sm text-amber-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              You haven&apos;t saved your Chatbot Settings yet. You can still copy the code, then save your theme and Q&amp;As anytime.
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold underline shrink-0"
          >
            Configure Now
          </Link>
        </div>
      )}

      {/* Embed Script Card */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E5F0E1] flex items-center justify-between gap-4 bg-[#F1F7EF]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E5F0E1] flex items-center justify-center text-[#254B35]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#202820]">
                Website Embed Snippet
              </h3>
              <p className="text-xs text-[#647267]">
                Chatbot ID: <span className="font-mono">{botId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-medium hover:bg-[#1e3d2a] transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>

        <div className="p-6 bg-[#202820] text-[#E5F0E1] font-mono text-sm overflow-x-auto">
          <pre>{embedScript}</pre>
        </div>
      </div>

      {/* Full Installation Guide */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[#254B35]" />
          <h3 className="text-lg font-semibold text-[#202820]">
            Full Setup Guide
          </h3>
        </div>

        {/* Platform Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#E5F0E1] pb-4">
          {[
            { id: "html", label: "Standard HTML" },
            { id: "nextjs", label: "React / Next.js" },
            { id: "cms", label: "WordPress / Shopify" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as "html" | "nextjs" | "cms")
              }
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#254B35] text-white"
                  : "bg-[#F1F7EF] text-[#647267] hover:text-[#254B35]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "html" && (
          <ol className="space-y-4 text-sm text-[#647267]">
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">01.</span>
              <span>
                Open your website&apos;s main{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  index.html
                </code>{" "}
                file (or shared footer template).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">02.</span>
              <span>
                Paste the copied script right before the closing{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  &lt;/body&gt;
                </code>{" "}
                tag.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">03.</span>
              <span>
                Save and deploy your website. Refresh your live site to see the chatbot bubble appear in the bottom-right corner.
              </span>
            </li>
          </ol>
        )}

        {activeTab === "nextjs" && (
          <ol className="space-y-4 text-sm text-[#647267]">
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">01.</span>
              <span>
                Open{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  src/app/layout.tsx
                </code>{" "}
                (or{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  index.html
                </code>{" "}
                in Vite/React).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">02.</span>
              <span>
                In Next.js, import{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  Script
                </code>{" "}
                from{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  next/script
                </code>{" "}
                and render it inside{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  &lt;body&gt;
                </code>{" "}
                with{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  strategy=&quot;afterInteractive&quot;
                </code>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">03.</span>
              <span>
                Rebuild and deploy. Your chatbot loads asynchronously without slowing down page load.
              </span>
            </li>
          </ol>
        )}

        {activeTab === "cms" && (
          <ol className="space-y-4 text-sm text-[#647267]">
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">01.</span>
              <span>
                <strong>WordPress:</strong> Go to{" "}
                <em>Appearance → Theme File Editor → footer.php</em> (or use the{" "}
                <em>WPCode / Insert Headers and Footers</em> plugin).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">02.</span>
              <span>
                <strong>Shopify:</strong> Go to{" "}
                <em>Online Store → Themes → Edit Code → theme.liquid</em>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-[#254B35]">03.</span>
              <span>
                Paste the script right before{" "}
                <code className="bg-[#F1F7EF] px-1.5 py-0.5 rounded text-[#202820]">
                  &lt;/body&gt;
                </code>{" "}
                and save.
              </span>
            </li>
          </ol>
        )}

        <div className="pt-4 border-t border-[#E5F0E1] text-xs text-[#254B35] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Future edits to your theme, bot name, or fixed Q&amp;As update automatically—you never need to replace this script.
          </span>
        </div>
      </div>
    </div>
  );
}
