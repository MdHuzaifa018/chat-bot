"use client";

import React, { useState } from "react";
import {
  Code,
  Copy,
  Check,
  Globe,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export default function EmbedPage() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"html" | "react" | "wordpress">("html");

  const chatbotId = "bot_4f9a2e8c1b7d";
  const embedCode = `<!-- SupportAI Autonomous Chatbot Widget -->
<script
  src="http://localhost:5000/widget.js"
  data-chatbot-id="${chatbotId}"
  async
></script>`;

  const reactCode = `// Add to your root layout.tsx or index.html
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="http://localhost:5000/widget.js"
          data-chatbot-id="${chatbotId}"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}`;

  const wpCode = `1. In WordPress Admin, navigate to Appearance -> Theme File Editor (or use 'Insert Headers and Footers' plugin).
2. Open footer.php or header.php.
3. Paste the following script tag right before the closing </body> tag:

<script src="http://localhost:5000/widget.js" data-chatbot-id="${chatbotId}" async></script>
4. Click 'Update File'. The chatbot will appear instantly on your live website!`;

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5F0E1] shadow-sm">
        <h2 className="text-2xl font-bold text-[#202820]">Embed Chatbot on Your Website</h2>
        <p className="text-sm text-[#647267] mt-1">
          Copy and paste this single script tag into any HTML page, CMS, or modern web framework.
        </p>
      </div>

      {/* 1-Line Embed Snippet Box */}
      <div className="bg-[#202820] rounded-3xl p-8 text-white relative shadow-xl overflow-hidden border border-[#254B35]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#A8C99B] uppercase tracking-wider">
            <Code className="w-4 h-4" /> 1-Line Script Embed Tag
          </div>

          <button
            onClick={() => handleCopy(embedCode)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#254B35] hover:bg-[#1E3D2B] text-white rounded-full text-xs font-semibold transition-all border border-[#A8C99B]/30 shadow"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#A8C99B]" /> Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Embed Code
              </>
            )}
          </button>
        </div>

        <pre className="font-mono text-sm text-[#E5F0E1] bg-black/40 p-5 rounded-2xl overflow-x-auto border border-white/10 leading-relaxed">
          {embedCode}
        </pre>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10 text-xs text-[#E5F0E1]/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#A8C99B]" />
            Shadow DOM Encapsulated (No CSS Clashes)
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#A8C99B]" />
            Fast Async &amp; Lazy Loading (~12KB)
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#A8C99B]" />
            Direct Gemini Grounding &amp; RAG
          </div>
        </div>
      </div>

      {/* Platform Instructions */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-8 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-[#202820]">Step-by-Step Installation Guides</h3>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#E5F0E1] pb-3">
          <button
            onClick={() => setActiveTab("html")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "html" ? "bg-[#254B35] text-white" : "text-[#647267] hover:bg-gray-100"
            }`}
          >
            HTML / Static Websites
          </button>
          <button
            onClick={() => setActiveTab("react")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "react" ? "bg-[#254B35] text-white" : "text-[#647267] hover:bg-gray-100"
            }`}
          >
            Next.js / React
          </button>
          <button
            onClick={() => setActiveTab("wordpress")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "wordpress" ? "bg-[#254B35] text-white" : "text-[#647267] hover:bg-gray-100"
            }`}
          >
            WordPress / Shopify / Webflow
          </button>
        </div>

        {activeTab === "html" && (
          <div className="space-y-4">
            <p className="text-sm text-[#647267] leading-relaxed">
              Add the snippet right before the closing <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs text-[#202820]">&lt;/body&gt;</code> tag on any page where you want the chatbot launcher to appear.
            </p>
            <div className="p-4 rounded-2xl bg-[#F8FAF7] border border-[#E5F0E1] font-mono text-xs text-[#202820]">
              &lt;!DOCTYPE html&gt;<br />
              &lt;html&gt;<br />
              &nbsp;&nbsp;&lt;body&gt;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&lt;h1&gt;Welcome to My Website&lt;/h1&gt;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&lt;!-- SupportAI Widget --&gt;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&lt;script src="http://localhost:5000/widget.js" data-chatbot-id="{chatbotId}" async&gt;&lt;/script&gt;<br />
              &nbsp;&nbsp;&lt;/body&gt;<br />
              &lt;/html&gt;
            </div>
          </div>
        )}

        {activeTab === "react" && (
          <div className="space-y-4">
            <p className="text-sm text-[#647267] leading-relaxed">
              Use Next.js <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs text-[#202820]">&lt;Script /&gt;</code> component with strategy lazyOnload for optimal performance.
            </p>
            <pre className="p-4 rounded-2xl bg-[#F8FAF7] border border-[#E5F0E1] font-mono text-xs text-[#202820] overflow-x-auto">
              {reactCode}
            </pre>
          </div>
        )}

        {activeTab === "wordpress" && (
          <div className="space-y-4">
            <p className="text-sm text-[#647267] leading-relaxed whitespace-pre-line">
              {wpCode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
