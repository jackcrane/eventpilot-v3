import OpenAI from "openai";

// Centralized OpenAI configuration and helpers

const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_API_BASE; // optional

// Defaults are overridable via env
export const defaultModel = process.env.OPENAI_MODEL || "gpt-5-nano";
export const defaultServiceTier = process.env.OPENAI_SERVICE_TIER || "priority";
export const defaultReasoningEffort = process.env.OPENAI_REASONING || null; // e.g., "minimal" | "low" | "medium" | "high"

let _client = null;

export const isOpenAIConfigured = () => Boolean(API_KEY);

export const getOpenAIClient = () => {
  if (!_client) {
    _client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  }
  return _client;
};

// Create a response via the OpenAI Responses API. Accepts only the prompt.
export const createResponse = async (prompt) => {
  if (!isOpenAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const client = getOpenAIClient();
  const payload = {
    model: defaultModel,
    input: prompt,
    service_tier: defaultServiceTier,
  };
  if (defaultReasoningEffort)
    payload.reasoning = { effort: defaultReasoningEffort };
  return client.responses.create(payload);
};

// Utility to extract plain text content from a Responses API result
export const extractText = (resp) => resp?.output_text || "";
