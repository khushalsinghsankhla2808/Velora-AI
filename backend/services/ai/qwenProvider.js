// PATH: backend/services/ai/qwenProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const qwenProvider = {
  name: "qwen",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "Qwen",
    });
  },
};
