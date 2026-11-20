import React from 'react';
import { Globe, Palette, BrainCircuit, MessageSquareCode, Code2, LineChart } from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Automatic Website Understanding',
    description: 'Provide your domain. Our safe crawler discovers sitemaps, navigates internal pages, and extracts clean product, service, and FAQ text in seconds.',
  },
  {
    icon: Palette,
    title: 'Brand & Visual Theme Detection',
    description: 'We automatically detect your primary brand colors, logo, favicon, and typography, styling the chatbot to look like a native part of your website.',
  },
  {
    icon: BrainCircuit,
    title: 'Isolated Gemini AI Knowledge Base',
    description: 'Direct Google Gemini API integration with semantic document retrieval. Answers are strictly grounded in your content with zero cross-tenant leakage.',
  },
  {
    icon: MessageSquareCode,
    title: 'Smart Suggested Questions',
    description: 'AI analyzes your actual offerings and generates 3 to 5 high-converting question chips so visitors know exactly what to ask.',
  },
  {
    icon: Code2,
    title: '1-Line JavaScript Embed',
    description: 'A lightweight, zero-dependency script with Shadow DOM style isolation that works on HTML, WordPress, Webflow, React, and Shopify.',
  },
  {
    icon: LineChart,
    title: 'Live Conversations & Analytics',
    description: 'Monitor real visitor chats, inspect unanswered questions, measure customer satisfaction, and discover what your clients ask most.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white border-y border-[#E5F0E1]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest text-[#254B35] uppercase bg-[#E5F0E1] px-3.5 py-1.5 rounded-full border border-[#A8C99B]/30">
            Engineered for Modern Businesses
          </span>
          <h2 className="text-3xl sm:text-4xl font-light text-[#202820] tracking-tight mt-4 mb-4">
            Everything You Need to <span className="font-bold text-[#254B35]">Automate Client Support</span>
          </h2>
          <p className="text-base text-[#647267]">
            Say goodbye to complex conversational trees and manual bot training. We extract, build, and deploy your intelligent chatbot automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-[#F1F7EF]/50 border border-[#E5F0E1] hover:bg-[#F1F7EF] transition-all hover:shadow-sm group"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5F0E1] flex items-center justify-center mb-6 text-[#254B35] group-hover:bg-[#254B35] group-hover:text-white transition-colors shadow-xs">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#202820] mb-2">{item.title}</h3>
                <p className="text-sm text-[#647267] leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}