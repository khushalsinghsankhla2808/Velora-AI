// PATH: backend/services/ai/openaiProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const openaiProvider = {
  name: "openai",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "OpenAI",
    });
  },
};
