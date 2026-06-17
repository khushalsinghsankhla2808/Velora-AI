// PATH: backend/services/ai/minimaxProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const minimaxProvider = {
  name: "minimax",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "MiniMax",
    });
  },
};
