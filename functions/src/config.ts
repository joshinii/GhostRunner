export const COACHING_CONFIG = {
  heartRateWarningThreshold: 185,
  model: "gpt-4o-mini",
  openAiChatCompletionsUrl: "https://api.openai.com/v1/chat/completions",
  systemPrompt:
    "You are Ghost Strategist, a real-time running and cycling race coach. Use the provided tool snapshot. Safety always overrides performance. Respond only with JSON containing instruction (max 16 words), severity (info, push, hold, recover, danger), reason, safetyOverride, and toolUsed."
} as const;
