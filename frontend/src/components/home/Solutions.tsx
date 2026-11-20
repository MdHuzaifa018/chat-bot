import React from 'react';
import { Code2, Check, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'Will the chatbot script slow down my website?',
    a: 'Not at all. The widget loads asynchronously (async/defer) and renders within a Shadow DOM container, meaning zero style conflicts and under 15KB footprint.',
  },
  {
    q: 'Can I customize the chatbot colors and avatar?',
    a: 'Yes. We auto-detect your website palette, but you have complete override controls in the Chatbot Builder for colors, bot name, avatar, font, position, and welcome text.',
  },
  {
    q: 'How does it prevent hallucinations?',
    a: 'We use strict retrieval-augmented generation (RAG) with Google Gemini. The assistant is instructed to answer strictly from your website pages and state clearly when info is unavailable.',
  },
  {
    q: 'What platforms are supported?',
    a: 'Any website that supports HTML or scripts: WordPress, Webflow, Shopify, Framer, Squarespace, React, Next.js, and static HTML websites.',
  },
];

export default function Solutions() {
  return (
    <section id="solutions" className="py-24 bg-white border-b border-[#E5F0E1]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Easy Embed Section */}
        <div className="bg-[#254B35] rounded-3xl p-8 sm:p-12 text-white mb-20 relative overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-6">
              <span className="text-xs uppercase font-bold tracking-widest text-[#A8C99B] bg-white/10 px-3 py-1 rounded-full">
                Effortless Integration
              </span>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight mt-4 mb-4">
                Just <span className="font-bold text-[#A8C99B]">One Line of Code</span> To Go Live
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
                Paste this script tag right before the closing &lt;/body&gt; tag on your website. No API keys or server setup needed on your end.
              </p>
              <div className="space-y-2 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#A8C99B]" /> Shadow DOM encapsulated (No CSS conflicts)
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#A8C99B]" /> Real-time instant streaming responses
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#A8C99B]" /> Mobile and desktop responsive design
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-slate-950/80 rounded-2xl border border-white/10 p-5 font-mono text-xs shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-slate-400">
                  <span className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#A8C99B]" /> HTML Embed Code
                  </span>
                  <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded">
                    Universal
                  </span>
                </div>
                <pre className="text-[#A8C99B] overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`<!-- SupportAI Chatbot Widget -->
<script
  src="https://your-saas.com/widget.js"
  data-chatbot-id="cb_live_9x81a2"
  async>
</script>`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest text-[#254B35] uppercase bg-[#E5F0E1] px-3.5 py-1.5 rounded-full border border-[#A8C99B]/30">
              Got Questions?
            </span>
            <h2 className="text-3xl font-light text-[#202820] tracking-tight mt-3 mb-2">
              Frequently Asked <span className="font-bold text-[#254B35]">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#F1F7EF]/50 border border-[#E5F0E1]">
                <h4 className="text-base font-bold text-[#202820] flex items-center gap-2.5 mb-2">
                  <HelpCircle className="w-4 h-4 text-[#254B35]" /> {item.q}
                </h4>
                <p className="text-sm text-[#647267] leading-relaxed pl-6.5">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}