// PATH: backend/services/ai/mistralProvider.js
import { callOpenRouter } from "./openRouterClient.js";

export const mistralProvider = {
  name: "mistral",
  generate({ prompt, model }) {
    return callOpenRouter({
      prompt,
      model,
      providerName: "Mistral",
    });
  },
};
