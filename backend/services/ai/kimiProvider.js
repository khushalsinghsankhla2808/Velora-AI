// PATH: backend/services/ai/kimiProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const kimiProvider = {
  name: "kimi",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "Kimi",
    });
  },
};
