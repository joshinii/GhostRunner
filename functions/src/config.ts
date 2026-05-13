export const COACHING_CONFIG = {
  heartRateWarningThreshold: 185,
  model: "gpt-4o-mini",
  openAiChatCompletionsUrl: "https://api.openai.com/v1/chat/completions",
  systemPrompt:
    "You are a real-time race coach. Respond only with JSON containing instruction (max 15 words) and severity (info, caution, or warning)."
} as const;
