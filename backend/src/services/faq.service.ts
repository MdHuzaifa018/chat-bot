import { supabaseRequest } from "../utils/supabase.js";

export interface FaqMatchResult {
  hit: boolean;
  question?: string;
  answer?: string;
  category?: string;
  source?: "database_cache" | "in_memory_cache";
}

interface RpcFaqResponse {
  hit: boolean;
  id?: string;
  question?: string;
  answer?: string;
  category?: string;
}

// Built-in verified institutional fallback cache for instant sub-millisecond retrieval
const IN_MEMORY_VERIFIED_FAQS = [
  {
    patterns: [/pricing/i, /cost/i, /subscription/i, /tiers/i],
    question: "How does the platform pricing work?",
    answer: "Our SaaS tiers start at $29/mo for the Starter plan and $99/mo for the Professional tier with full SLA.",
    category: "pricing",
  },
  {
    patterns: [/services/i, /what\s+do\s+you\s+do/i, /features/i],
    question: "What services do you provide?",
    answer: "We provide AI automation, client support chatbots, and cloud engineering services.",
    category: "services",
  },
  {
    patterns: [/fee/i, /tuition/i, /payment\s+deadline/i, /due\s+date/i],
    question: "What is the fee payment deadline?",
    answer: "Fee deadlines for the current academic session are published on the official student portal. Payment must be cleared prior to the 15th of each billing month.",
    category: "finance",
  },
  {
    patterns: [/reset\s+password/i, /login\s+issue/i, /portal\s+login/i, /cannot\s+login/i],
    question: "How do I reset my student portal login?",
    answer: "To reset your student login credentials, visit the official student portal login page, click 'Forgot Password', and follow the OTP verification sent to your registered email.",
    category: "support",
  },
  {
    patterns: [/exam\s+schedule/i, /exam\s+dates/i, /timetable/i, /date\s+sheet/i],
    question: "What is the upcoming exam schedule?",
    answer: "Official examination schedules and room allocations are posted under the Examinations section of the student portal two weeks prior to the exam period.",
    category: "academics",
  },
];

export class FaqService {
  /**
   * Looks up verified FAQ cache before calling external LLM providers.
   * Returns instant verified answer if found.
   */
  static async checkFaqCache(query: string): Promise<FaqMatchResult> {
    const cleanQuery = query.trim().toLowerCase();

    // 1. Try Supabase FAQ Cache via RPC (persisted and tracked)
    try {
      const rpcResult = await supabaseRequest<RpcFaqResponse>("rpc/lookup_faq_cache", {
        method: "POST",
        body: { p_query: cleanQuery },
      });

      if (rpcResult && rpcResult.hit && rpcResult.answer) {
        return {
          hit: true,
          question: rpcResult.question,
          answer: rpcResult.answer,
          category: rpcResult.category,
          source: "database_cache",
        };
      }
    } catch {
      // Database cache lookup failed or table not yet created; proceed to in-memory check
    }

    // 2. Fallback to In-Memory Verified Cache (instant zero-token answer)
    for (const faq of IN_MEMORY_VERIFIED_FAQS) {
      if (faq.patterns.some((pattern) => pattern.test(cleanQuery))) {
        return {
          hit: true,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          source: "in_memory_cache",
        };
      }
    }

    return { hit: false };
  }
}
