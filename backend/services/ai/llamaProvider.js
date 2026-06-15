// PATH: backend/services/ai/llamaProvider.js

import { callOpenRouter } from "./openRouterClient.js";

export const llamaProvider = {
  name: "llama",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "Llama",
    });
  },
};
