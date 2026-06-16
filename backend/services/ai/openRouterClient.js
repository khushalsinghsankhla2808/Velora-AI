// PATH: backend/services/ai/openRouterClient.js

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error(
    "[openRouterClient] OPENROUTER_API_KEY is not set in environment variables."
  );
}

const DEFAULT_TIMEOUT_MS = 90000;
const MAX_ATTEMPTS = 2;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readErrorBody = async (response) => {
  try {
    return await response.text();
  } catch (error) {
    return response.statusText || "Unknown provider error";
  }
};

export const callOpenRouter = async ({
  prompt,
  model,
  providerName,
  systemPrompt = "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
}) => {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await readErrorBody(response);
        throw new Error(`${providerName} provider error: ${errorBody}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`${providerName} provider returned empty content`);
      }

      return {
        success: true,
        content,
        tokensUsed: data?.usage?.total_tokens || 0,
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError =
        error.name === "AbortError"
          ? new Error(`${providerName} provider timed out`)
          : error;

      if (attempt < MAX_ATTEMPTS) {
        await wait(500 * attempt);
      }
    }
  }

  // Infinite recursion is not possible because the fallback model (google/gemini-2.5-pro)
  // does not match model.includes("deepseek") since it lacks the "deepseek" substring.
  if (model.includes("deepseek")) {
    console.error(`[AI Fallback] DeepSeek failed after all attempts. Switching to google/gemini-2.5-pro. Reason: ${lastError.message}`);
    return callOpenRouter({
      prompt,
      model: "google/gemini-2.5-pro",
      providerName: "Gemini Pro (Fallback)",
      systemPrompt,
    });
  }

  throw lastError;
};
