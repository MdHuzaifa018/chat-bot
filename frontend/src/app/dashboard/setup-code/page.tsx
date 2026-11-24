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
  Globe,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { fetchWebsites, fetchWebsiteDetails, API_ORIGIN, type WebsiteData } from "@/api/saasApi";

export default function SetupCodePage() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"html" | "nextjs" | "cms">("html");
  const [websites, setWebsites] = useState<WebsiteData[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [botName, setBotName] = useState("Support Assistant");
  const [botId, setBotId] = useState("");
  const [websiteDomain, setWebsiteDomain] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useProductionUrl, setUseProductionUrl] = useState(false);
  const [customHostUrl, setCustomHostUrl] = useState("");

  const loadWebsiteConfig = async (siteId: string) => {
    setIsLoading(true);
    try {
      const details = await fetchWebsiteDetails(siteId);
      if (details) {
        const cfg = details.chatbotConfig;
        const name = cfg?.chatbot_name || details.website?.name || "Support Assistant";
        const publicId = cfg?.public_chatbot_id || "";
        const domain = details.website?.domain || details.website?.url || "";

        setBotName(name);
        setBotId(publicId);
        setWebsiteDomain(domain);
        setIsConfigured(Boolean(publicId));

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("supportai_active_site_id", siteId);
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to load details for site:", siteId, err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const sites = await fetchWebsites();
        if (Array.isArray(sites) && sites.length > 0) {
          setWebsites(sites);

          // Check if a specific site was requested via URL query or session storage
          let targetSiteId = "";
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            targetSiteId = params.get("site") || "";
            if (!targetSiteId) {
              targetSiteId = sessionStorage.getItem("supportai_active_site_id") || "";
            }
          }

          const matchedSite = sites.find((s) => s.id === targetSiteId) || sites[0];
          setSelectedWebsiteId(matchedSite.id);
          await loadWebsiteConfig(matchedSite.id);
        } else {
          setIsConfigured(false);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("Could not fetch websites list:", err);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleWebsiteChange = async (newSiteId: string) => {
    setSelectedWebsiteId(newSiteId);
    await loadWebsiteConfig(newSiteId);
  };

  // Determine active script host URL
  const scriptHost = useProductionUrl
    ? (customHostUrl.trim() || (typeof window !== "undefined" ? window.location.origin : API_ORIGIN))
    : API_ORIGIN;

  const embedScript = `<script
  src="${scriptHost}/widget.js"
  data-chatbot-id="${botId || "YOUR_CHATBOT_ID"}"
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
          <h2 className="text-2xl font-bold tracking-tight text-[#202820]">
            Embed Setup Code
          </h2>
          <p className="text-sm text-[#647267] mt-1">
            Add this single script tag to your website to launch{" "}
            <span className="font-semibold text-[#254B35]">
              {isLoading ? "Loading..." : botName}
            </span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {botId && (
            <Link
              href={`/demo-embed.html?bot=${encodeURIComponent(botId)}&api=${encodeURIComponent(scriptHost)}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-semibold hover:bg-[#1e3d2a] transition-all shadow-sm"
            >
              Test Live Widget <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#254B35] border border-[#E5F0E1] rounded-full text-xs font-medium hover:bg-[#E5F0E1] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
          </Link>
        </div>
      </div>

      {/* Website Selector Dropdown */}
      {websites.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-[#E5F0E1] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E5F0E1] flex items-center justify-center text-[#254B35]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#202820]">
                Select Website to Embed
              </p>
              <p className="text-[11px] text-[#647267]">
                Switch between your connected client websites to get their unique chatbot embed code.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedWebsiteId}
              onChange={(e) => handleWebsiteChange(e.target.value)}
              disabled={isLoading}
              className="bg-[#F1F7EF] border border-[#E5F0E1] text-[#202820] text-xs font-medium rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-[#A8C99B] focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {websites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name || site.domain} ({site.domain})
                </option>
              ))}
            </select>
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#254B35]" />}
          </div>
        </div>
      )}

      {/* Config Status Banner */}
      {isConfigured ? (
        <div className="p-4 rounded-2xl bg-[#E5F0E1] border border-[#A8C99B]/50 flex items-center justify-between gap-3 text-sm text-[#254B35]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              Chatbot configuration is active for <strong>{botName}</strong> ({websiteDomain || "Ready to embed"}).
            </span>
          </div>
          <span className="text-xs font-mono bg-white/70 px-2 py-0.5 rounded-lg border border-[#A8C99B]/40">
            {botId}
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-sm text-amber-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              You haven&apos;t saved your Chatbot Settings yet. Configure your website to generate your live embed code.
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
        <div className="p-5 sm:p-6 border-b border-[#E5F0E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F1F7EF]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E5F0E1] flex items-center justify-center text-[#254B35]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#202820]">
                Website Embed Snippet
              </h3>
              <p className="text-xs text-[#647267]">
                Chatbot ID: <span className="font-mono font-medium text-[#254B35]">{botId || "Not generated yet"}</span>
                {websiteDomain && <span> • Domain: <strong className="font-normal text-[#202820]">{websiteDomain}</strong></span>}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            disabled={!botId}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#254B35] text-white rounded-full text-xs font-medium hover:bg-[#1e3d2a] transition-all cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>

        <div className="p-6 bg-[#202820] text-[#E5F0E1] font-mono text-sm overflow-x-auto relative">
          <pre>{embedScript}</pre>
        </div>

        {/* Script URL Domain Configuration */}
        <div className="p-4 bg-[#FAFDF9] border-t border-[#E5F0E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#647267]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#202820]">Script Origin:</span>
            <span className="font-mono text-[#254B35] bg-[#E5F0E1] px-2 py-0.5 rounded">
              {scriptHost}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useProductionUrl}
                onChange={(e) => setUseProductionUrl(e.target.checked)}
                className="rounded border-[#E5F0E1] text-[#254B35] focus:ring-[#A8C99B]"
              />
              <span className="text-xs">Custom Host URL</span>
            </label>
            {useProductionUrl && (
              <input
                type="url"
                value={customHostUrl}
                onChange={(e) => setCustomHostUrl(e.target.value)}
                placeholder="https://your-domain.com"
                className="bg-white border border-[#E5F0E1] px-2.5 py-1 rounded-lg text-xs font-mono text-[#202820] focus:outline-none focus:ring-1 focus:ring-[#254B35]"
              />
            )}
          </div>
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
