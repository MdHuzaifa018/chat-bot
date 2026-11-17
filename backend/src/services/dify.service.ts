import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import type { DifyReply } from "../types/index.js";

interface DifyChatResponse {
  answer?: unknown;
  conversation_id?: unknown;
}

interface DifyWorkflowResponse {
  data?: {
    status?: unknown;
    error?: unknown;
    outputs?: Record<string, unknown>;
  };
}

/**
 * Dify Service
 * Forwards user queries to Dify RAG and Gemini LLM.
 */
export class DifyService {
  static async getReply(input: {
    message: string;
    clientId: string;
    difyConversationId: string | null;
  }): Promise<DifyReply> {
    const { baseUrl, apiKey, appMode, timeoutMs, workflowInputField, workflowOutputField, isConfigured } = env.dify;

    if (!isConfigured || !apiKey || apiKey.includes("your_dify_api_key")) {
      return {
        answer: `Hello! I received your question: "${input.message}". This is a simulated response. Once you add your live DIFY_API_KEY in backend/.env.local, you will get grounded Google Gemini AI answers!`,
        conversationId: null,
      };
    }

    const isChatMode = appMode === "chat";
    const endpoint = `${baseUrl}/${isChatMode ? "chat-messages" : "workflows/run"}`;

    const requestBody = isChatMode
      ? {
          inputs: {},
          query: input.message,
          response_mode: "blocking",
          conversation_id: input.difyConversationId ?? "",
          user: input.clientId,
        }
      : {
          inputs: { [workflowInputField]: input.message },
          response_mode: "blocking",
          user: input.clientId,
        };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ApiError(502, "AI_UNAVAILABLE", "The AI service could not be reached.");
    }

    if (!response.ok) {
      throw new ApiError(502, "AI_REQUEST_FAILED", "The AI service failed to process this question.");
    }

    let payload: DifyChatResponse | DifyWorkflowResponse;
    try {
      payload = (await response.json()) as DifyChatResponse | DifyWorkflowResponse;
    } catch {
      throw new ApiError(502, "AI_INVALID_RESPONSE", "Invalid response received from AI service.");
    }

    if (isChatMode) {
      const chatPayload = payload as DifyChatResponse;
      if (typeof chatPayload.answer !== "string") {
        throw new ApiError(502, "AI_INVALID_RESPONSE", "The AI service returned no answer.");
      }
      return {
        answer: chatPayload.answer,
        conversationId: typeof chatPayload.conversation_id === "string" ? chatPayload.conversation_id : null,
      };
    }

    const workflowPayload = payload as DifyWorkflowResponse;
    const answer = workflowPayload.data?.outputs?.[workflowOutputField];
    if (typeof answer !== "string") {
      throw new ApiError(502, "AI_INVALID_RESPONSE", "The configured Dify workflow did not return a valid answer.");
    }

    return { answer, conversationId: null };
  }
}
