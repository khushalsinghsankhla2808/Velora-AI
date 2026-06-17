// PATH: backend/services/ai/providerFactory.js

import { anthropicProvider } from "./anthropicProvider.js";
import { deepseekProvider } from "./deepseekProvider.js";
import { geminiProvider } from "./geminiProvider.js";
import { kimiProvider } from "./kimiProvider.js";
import { llamaProvider } from "./llamaProvider.js";
import { minimaxProvider } from "./minimaxProvider.js";
import { mistralProvider } from "./mistralProvider.js";
import { openaiProvider } from "./openaiProvider.js";
import { qwenProvider } from "./qwenProvider.js";

const providers = {
  anthropic: anthropicProvider,
  deepseek: deepseekProvider,
  gemini: geminiProvider,
  kimi: kimiProvider,
  llama: llamaProvider,
  minimax: minimaxProvider,
  mistral: mistralProvider,
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