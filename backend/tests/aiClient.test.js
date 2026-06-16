import "dotenv/config";
import "./setup.js";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

// Ensure a mock key is set if dotenv did not set one
if (!process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = "mock-openrouter-key";
}

import { callOpenRouter } from "../services/ai/openRouterClient.js";

describe("OpenRouter Client Unit Tests", () => {
  const originalFetch = globalThis.fetch;
  let fetchMockCalls = [];

  beforeEach(() => {
    fetchMockCalls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * Helper to set up a mock global fetch implementation.
   * @param {Array<object>} responses - Array of mocked response definitions.
   */
  const setupFetchMock = (responses) => {
    let callIndex = 0;
    globalThis.fetch = async (url, options) => {
      const parsedBody = JSON.parse(options.body);
      fetchMockCalls.push({ url, model: parsedBody.model, headers: options.headers });

      const currentResponse = responses[callIndex];
      callIndex++;

      if (!currentResponse) {
        throw new Error("No mocked response defined for this call");
      }

      if (currentResponse.shouldTimeout) {
        const err = new Error("The operation was aborted.");
        err.name = "AbortError";
        throw err;
      }

      if (currentResponse.networkError) {
        throw new Error("Network connection failed");
      }

      return {
        ok: currentResponse.ok !== false,
        status: currentResponse.status || 200,
        text: async () => currentResponse.text || "",
        json: async () => currentResponse.json || {},
      };
    };
  };

  test("Successful DeepSeek call returns { success: true, content, tokensUsed }", async () => {
    setupFetchMock([
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "Success Content",
              },
            },
          ],
          usage: {
            total_tokens: 150,
          },
        },
      },
    ]);

    const result = await callOpenRouter({
      prompt: "Test Prompt",
      model: "deepseek/deepseek-r1",
      providerName: "DeepSeek",
    });

    assert.deepStrictEqual(result, {
      success: true,
      content: "Success Content",
      tokensUsed: 150,
    });
    assert.strictEqual(fetchMockCalls.length, 1);
    assert.strictEqual(fetchMockCalls[0].model, "deepseek/deepseek-r1");
  });

  test("DeepSeek times out → retries → falls back to Gemini → returns content", async () => {
    setupFetchMock([
      { shouldTimeout: true }, // DeepSeek 1st attempt times out
      { shouldTimeout: true }, // DeepSeek 2nd attempt times out
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "Gemini Fallback Content",
              },
            },
          ],
          usage: {
            total_tokens: 250,
          },
        },
      }, // Gemini succeeds
    ]);

    const result = await callOpenRouter({
      prompt: "Test Prompt",
      model: "deepseek/deepseek-r1",
      providerName: "DeepSeek",
    });

    assert.deepStrictEqual(result, {
      success: true,
      content: "Gemini Fallback Content",
      tokensUsed: 250,
    });
    assert.strictEqual(fetchMockCalls.length, 3);
    assert.strictEqual(fetchMockCalls[0].model, "deepseek/deepseek-r1");
    assert.strictEqual(fetchMockCalls[1].model, "deepseek/deepseek-r1");
    assert.strictEqual(fetchMockCalls[2].model, "google/gemini-2.5-pro");
  });

  test("DeepSeek returns non-ok response → falls back to Gemini", async () => {
    setupFetchMock([
      {
        ok: false,
        status: 500,
        text: "Internal Server Error",
      }, // DeepSeek 1st attempt fails
      {
        ok: false,
        status: 500,
        text: "Internal Server Error",
      }, // DeepSeek 2nd attempt fails
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "Gemini Fallback Content on Error",
              },
            },
          ],
          usage: {
            total_tokens: 300,
          },
        },
      }, // Gemini succeeds
    ]);

    const result = await callOpenRouter({
      prompt: "Test Prompt",
      model: "deepseek/deepseek-r1",
      providerName: "DeepSeek",
    });

    assert.deepStrictEqual(result, {
      success: true,
      content: "Gemini Fallback Content on Error",
      tokensUsed: 300,
    });
    assert.strictEqual(fetchMockCalls.length, 3);
    assert.strictEqual(fetchMockCalls[0].model, "deepseek/deepseek-r1");
    assert.strictEqual(fetchMockCalls[1].model, "deepseek/deepseek-r1");
    assert.strictEqual(fetchMockCalls[2].model, "google/gemini-2.5-pro");
  });

  test("Both DeepSeek and Gemini fail → throws lastError", async () => {
    setupFetchMock([
      { shouldTimeout: true }, // DeepSeek 1st attempt times out
      { shouldTimeout: true }, // DeepSeek 2nd attempt times out
      { shouldTimeout: true }, // Gemini fallback 1st attempt times out
      { shouldTimeout: true }, // Gemini fallback 2nd attempt times out
    ]);

    await assert.rejects(
      async () => {
        await callOpenRouter({
          prompt: "Test Prompt",
          model: "deepseek/deepseek-r1",
          providerName: "DeepSeek",
        });
      },
      (err) => {
        assert.ok(err.message.includes("timed out") || err.message.includes("aborted"));
        return true;
      }
    );

    assert.strictEqual(fetchMockCalls.length, 4);
    assert.strictEqual(fetchMockCalls[0].model, "deepseek/deepseek-r1");
    assert.strictEqual(fetchMockCalls[1].model, "deepseek/deepseek-r1");
    assert.strictEqual(fetchMockCalls[2].model, "google/gemini-2.5-pro");
    assert.strictEqual(fetchMockCalls[3].model, "google/gemini-2.5-pro");
  });

  test("Missing OPENROUTER_API_KEY env var → throws on module load", async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      await assert.rejects(
        () => import(`../services/ai/openRouterClient.js?t=${Date.now()}`),
        (err) => {
          assert.strictEqual(
            err.message,
            "[openRouterClient] OPENROUTER_API_KEY is not set in environment variables."
          );
          return true;
        }
      );
    } finally {
      process.env.OPENROUTER_API_KEY = originalKey;
    }
  });
});
