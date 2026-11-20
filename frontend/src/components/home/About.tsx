import React from 'react';
import { Globe, Wand2, Terminal, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    step: '01',
    icon: Globe,
    title: 'Enter Your Website URL',
    description: 'Provide your domain name. Our server safely crawls your sitemap, extracts readable text from your public pages, and organizes it.',
  },
  {
    step: '02',
    icon: Wand2,
    title: 'AI Builds Your Knowledge & Theme',
    description: 'Our engine extracts your brand colors and logo, constructs an isolated Gemini knowledge base, and generates smart suggested questions.',
  },
  {
    step: '03',
    icon: Terminal,
    title: 'Paste Embed Code & Go Live',
    description: 'Copy our 1-line script tag into your website HTML, WordPress, or Webflow. Your new AI assistant goes live immediately with zero maintenance.',
  },
];

export default function About() {
  return (
    <section id="how-it-works" className="py-24 bg-[#F1F7EF]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest text-[#254B35] uppercase bg-[#E5F0E1] px-3.5 py-1.5 rounded-full border border-[#A8C99B]/30">
            Frictionless Setup
          </span>
          <h2 className="text-3xl sm:text-4xl font-light text-[#202820] tracking-tight mt-4 mb-4">
            How It Works in <span className="font-bold text-[#254B35]">3 Simple Steps</span>
          </h2>
          <p className="text-base text-[#647267]">
            From a raw URL to an intelligent, branded support chatbot operating on your website in under 2 minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white p-8 rounded-3xl border border-[#E5F0E1] shadow-xs relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-3xl font-black text-[#A8C99B]/60 font-mono">{item.step}</span>
                    <div className="w-12 h-12 rounded-2xl bg-[#F1F7EF] flex items-center justify-center text-[#254B35]">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[#202820] mb-3">{item.title}</h3>
                  <p className="text-sm text-[#647267] leading-relaxed mb-6">{item.description}</p>
                </div>

                <div className="h-1 w-full bg-[#F1F7EF] rounded-full overflow-hidden">
                  <div className="h-full bg-[#254B35] rounded-full w-2/3"></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#254B35] hover:bg-[#1b3626] text-white text-sm font-semibold rounded-full transition-all shadow-sm"
          >
            Start Automatic Setup <ArrowRight className="w-4 h-4 text-[#A8C99B]" />
          </Link>
        </div>
      </div>
    </section>
  );
}