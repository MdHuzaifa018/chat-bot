import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function CTA() {
  return (
    <section className="py-24 bg-[#F1F7EF] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center relative z-10">
        <div className="max-w-3xl mx-auto bg-white border border-[#E5F0E1] rounded-3xl p-10 sm:p-14 shadow-lg shadow-[#254B35]/5">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#E5F0E1] text-[#254B35] text-xs font-semibold uppercase tracking-wider mb-6 border border-[#A8C99B]/30">
            <Sparkles className="w-3.5 h-3.5" /> Start Free Today
          </div>
          <h2 className="text-3xl sm:text-4xl font-light text-[#202820] tracking-tight mb-4">
            Ready to Deploy Your Own <br />
            <span className="font-bold text-[#254B35]">AI Support Assistant?</span>
          </h2>
          <p className="text-base text-[#647267] max-w-xl mx-auto mb-8 leading-relaxed">
            Join forward-thinking businesses automating customer queries, saving hours of support time, and boosting conversions with branded AI assistance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-[#254B35] hover:bg-[#1b3626] text-white rounded-full font-semibold transition-all duration-300 shadow-md shadow-[#254B35]/20"
            >
              Add Your Website Now <ArrowRight className="w-4 h-4 text-[#A8C99B]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}