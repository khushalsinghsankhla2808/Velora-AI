// PATH: backend/services/ai/deepseekProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const deepseekProvider = {
  name: "deepseek",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "DeepSeek",
    });
  },
};
