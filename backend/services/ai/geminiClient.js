// PATH: backend/services/ai/geminiClient.js

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("[geminiClient] OPENROUTER_API_KEY is not set in environment variables.");
}

const DEFAULT_TIMEOUT_MS = 90000;
const MAX_ATTEMPTS = 2;
const GEMINI_FLASH_MODEL = "google/gemini-2.5-flash";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readErrorBody = async (response) => {
  try {
    return await response.text();
  } catch (error) {
    return response.statusText || "Unknown provider error";
  }
};

export const callGeminiFlash = async ({
  prompt,
  systemPrompt = "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
  max_tokens = 8192,
}) => {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error("[geminiClient] OPENROUTER_API_KEY is not set in environment variables.");
    err.code = "AI_UNAVAILABLE";
    throw err;
  }

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
          model: GEMINI_FLASH_MODEL,
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
          max_tokens,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await readErrorBody(response);
        throw new Error(`Gemini provider error: ${errorBody}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`Gemini provider returned empty content`);
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
          ? new Error(`Gemini provider timed out`)
          : error;

      if (attempt < MAX_ATTEMPTS) {
        await wait(500 * attempt);
      }
    }
  }

  throw lastError;
};

// Backward-compatible wrapper that maps calls to the centralized Gemini Flash model
export const callOpenRouter = async (args) => {
  return callGeminiFlash({
    prompt: args.prompt,
    systemPrompt: args.systemPrompt,
    max_tokens: args.maxTokens || args.max_tokens || 8192,
  });
};
