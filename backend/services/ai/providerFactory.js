// PATH: backend/services/ai/providerFactory.js

import { anthropicProvider } from "./anthropicProvider.js";
import { deepseekProvider } from "./deepseekProvider.js";
import { geminiProvider } from "./geminiProvider.js";
import { llamaProvider } from "./llamaProvider.js";
import { openaiProvider } from "./openaiProvider.js";
import { qwenProvider } from "./qwenProvider.js";

const providers = {
  anthropic: anthropicProvider,
  deepseek: deepseekProvider,
  gemini: geminiProvider,
  llama: llamaProvider,
  openai: openaiProvider,
  qwen: qwenProvider,
};

export const providerFactory = (providerName) => {
  const provider = providers[providerName];

  if (!provider) {
    throw new Error(`Unsupported AI provider: ${providerName}`);
  }

  return provider;
};
