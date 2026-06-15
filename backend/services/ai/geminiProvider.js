// PATH: backend/services/ai/geminiProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const geminiProvider = {
  name: "gemini",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "Gemini",
    });
  },
};
