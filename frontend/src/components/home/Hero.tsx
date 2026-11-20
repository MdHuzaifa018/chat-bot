import React from 'react';
import { Bot, ArrowRight, Sparkles, Globe, Palette, Code, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
  return (
    <section id="home" className="relative pt-20 pb-28 overflow-hidden bg-[#F1F7EF]">
      {/* Background radial accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#A8C99B]/30 rounded-full blur-3xl pointer-events-none -z-0"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: SaaS Value Proposition */}
          <div className="lg:col-span-7 max-w-2xl">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-semibold uppercase tracking-wider mb-6 border border-[#A8C99B]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#254B35]" />
              Multi-Tenant AI Chatbot SaaS
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-[#202820] leading-[1.12] tracking-tight mb-6">
              Turn Your Website Into an <br />
              <span className="font-bold text-[#254B35]">Intelligent AI Support Agent</span>
            </h1>

            <p className="text-lg text-[#647267] mb-8 leading-relaxed">
              Enter your website URL. Our platform automatically crawls your pages, learns your products and pricing, extracts your brand theme, and generates a branded AI support chatbot ready to embed with 1 line of JavaScript.
            </p>

            {/* Quick URL Input Demo Form */}
            <div className="bg-white p-2.5 rounded-2xl border border-[#E5F0E1] shadow-md flex flex-col sm:flex-row gap-2 max-w-xl mb-8">
              <div className="flex-1 flex items-center gap-2.5 px-4 py-2">
                <Globe className="w-5 h-5 text-[#647267]" />
                <input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  defaultValue="https://curiousrabit.com"
                  className="w-full text-sm font-medium text-[#202820] placeholder:text-[#647267]/60 focus:outline-none bg-transparent"
                />
              </div>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#254B35] hover:bg-[#1a3525] text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
              >
                Build Chatbot <ArrowRight className="w-4 h-4 text-[#A8C99B]" />
              </Link>
            </div>

            {/* Value checklist */}
            <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs font-medium text-[#647267]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> 60-second auto crawling
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> Auto brand color matching
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> 1-line script embed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#254B35]" /> Powered by Gemini AI
              </span>
            </div>
          </div>

          {/* Right Column: Live External Website Preview Mockup with Branded Embedded Widget */}
          <div className="lg:col-span-5 relative">
            <div className="relative bg-white rounded-3xl shadow-2xl border border-[#E5F0E1] overflow-hidden">
              {/* Browser Mockup Chrome Bar */}
              <div className="bg-[#E5F0E1]/80 px-4 py-3 border-b border-[#E5F0E1] flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 bg-white px-3 py-1 rounded-md text-[11px] text-[#647267] font-mono truncate mx-2 text-center border border-[#E5F0E1]">
                  https://client-store.com
                </div>
              </div>

              {/* Sample Customer Website Content inside Mockup */}
              <div className="p-6 bg-slate-50 min-h-[380px] relative flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-10 w-4/5 bg-slate-300 rounded font-serif text-xs p-2 text-slate-700">
                    Modern Cloud Solutions & Consulting
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="h-16 bg-white border border-slate-200 rounded-xl p-2 text-[10px] text-slate-500">
                      Tier 1 Starter Plan
                    </div>
                    <div className="h-16 bg-white border border-slate-200 rounded-xl p-2 text-[10px] text-slate-500">
                      Enterprise Support
                    </div>
                  </div>
                </div>

                {/* Floating Branded Chatbot Widget inside the Client Site */}
                <div className="bg-white rounded-2xl shadow-xl border border-[#A8C99B]/50 p-4 w-full mt-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#254B35] flex items-center justify-center text-white">
                        <Bot className="w-4 h-4 text-[#A8C99B]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#202820]">Store Support AI</div>
                        <div className="text-[9px] text-[#A8C99B] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#254B35]"></span> Ready to help
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#E5F0E1] text-[#254B35] px-2 py-0.5 rounded-full font-semibold">
                      Live Widget
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#F1F7EF] text-[#202820] p-2.5 rounded-xl rounded-tl-sm text-[11px] leading-relaxed">
                      Hi there! I learned your site's products and pricing. Ask me anything!
                    </div>
                    {/* Suggested questions chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="bg-white border border-[#E5F0E1] text-[10px] text-[#254B35] px-2 py-1 rounded-lg">
                        What are the pricing tiers?
                      </span>
                      <span className="bg-white border border-[#E5F0E1] text-[10px] text-[#254B35] px-2 py-1 rounded-lg">
                        How to book a demo?
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}