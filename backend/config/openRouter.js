import logger from "../utils/logger.js";
import extractJson from "../utils/extractJson.js";

const DEFAULT_PRIMARY = "deepseek/deepseek-r1";
const DEFAULT_FALLBACK = "google/gemini-2.5-flash";
const DEFAULT_TIMEOUT = 30000;

/**
 * Custom error class representing AI service unavailability.
 */
class AIServiceUnavailableError extends Error {
  constructor(message) {
    super(message || "AI service temporarily unavailable");
    this.name = "AIServiceUnavailableError";
    this.code = "AI_UNAVAILABLE";
    this.statusCode = 503;
  }
}

/**
 * Performs a completions API call with timeout using AbortController.
 *
 * @param {string} prompt - Prompt to send to the AI.
 * @param {string} model - AI model identifier.
 * @param {number} timeoutMs - Timeout limit in milliseconds.
 * @returns {Promise<string>} Content string from model completions.
 */
const fetchWithTimeout = async (prompt, model, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`API returned HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Response content is empty");
    }

    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
};

/**
 * Calls AI with configured primary and fallback models and retry mechanism.
 *
 * @param {string} prompt - Prompt to generate code/website.
 * @param {object} [options] - Options dictionary.
 * @param {string} [options.userId] - ID of the calling user.
 * @returns {Promise<string>} The raw AI completions response.
 */
export const callAIWithFallback = async (prompt, { userId } = {}) => {
  const primaryModel = process.env.AI_PRIMARY_MODEL || DEFAULT_PRIMARY;
  const fallbackModel = process.env.AI_FALLBACK_MODEL || DEFAULT_FALLBACK;
  const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT, 10);
  const promptLength = prompt.length;

  // 1. Try primary model first
  try {
    const content = await fetchWithTimeout(prompt, primaryModel, timeoutMs);

    // Validate if the response is parseable JSON containing a code field
    const parsed = extractJson(content);
    if (!parsed || !parsed.code) {
      throw new Error("Invalid or unparseable JSON response format");
    }

    // Extract provider name for logging (e.g. "deepseek/deepseek-r1" -> "deepseek")
    const modelProvider = primaryModel.split("/")[0] || primaryModel;
    logger.info({ model: modelProvider, userId, promptLength });
    return content;
  } catch (primaryError) {
    logger.warn({
      message: `Primary AI model (${primaryModel}) failed, timed out, or returned unparseable JSON. Retrying with fallback model (${fallbackModel}).`,
      error: primaryError.message,
      userId,
    });

    // 2. Retry ONCE with the fallback model
    try {
      const content = await fetchWithTimeout(prompt, fallbackModel, timeoutMs);

      // Validate if the fallback response is parseable JSON containing a code field
      const parsed = extractJson(content);
      if (!parsed || !parsed.code) {
        throw new Error("Invalid or unparseable fallback JSON response format");
      }

      // Log the fallback model usage
      const modelProvider = fallbackModel.split("/")[0] || fallbackModel;
      logger.info({ model: modelProvider, userId, promptLength });
      return content;
    } catch (fallbackError) {
      logger.error({
        message: `Fallback AI model (${fallbackModel}) also failed.`,
        error: fallbackError.message,
        userId,
      });

      // 3. Throw a clear unavailable error
      throw new AIServiceUnavailableError();
    }
  }
};

// Keep original function for backward compatibility
export const generateResponse = async (prompt, model = "google/gemini-2.0-flash-exp:free") => {
    try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
                    },
                    {
                        role: "user",
                        content: "systemPrompt" in arguments[2] ? arguments[2].systemPrompt : prompt,
                    },
                ],
                temperature: 0.2,
            }),
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error("OpenRouter API Error: " + error);
        }

        const data = await res.json();
        return data.choices[0].message.content;
    } catch (error) {
        if (model.includes("deepseek")) {
            console.warn(`DeepSeek model call failed. Falling back to google/gemini-2.0-flash-exp:free. Error: ${error.message}`);
            return generateResponse(prompt, "google/gemini-2.0-flash-exp:free");
        }
        throw error;
    }
};