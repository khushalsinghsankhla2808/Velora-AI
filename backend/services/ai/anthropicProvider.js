// PATH: backend/services/ai/anthropicProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const anthropicProvider = {
  name: "anthropic",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "Anthropic",
    });
  },
};
