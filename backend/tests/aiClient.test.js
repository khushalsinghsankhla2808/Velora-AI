import "dotenv/config";
import "./setup.js";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

// Ensure a mock key is set if dotenv did not set one
if (!process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = "mock-openrouter-key";
}

import { callOpenRouter } from "../services/ai/geminiClient.js";

describe("Gemini Flash Client Unit Tests", () => {
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

  test("Successful Gemini Flash call returns { success: true, content, tokensUsed }", async () => {
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
    });

    assert.deepStrictEqual(result, {
      success: true,
      content: "Success Content",
      tokensUsed: 150,
    });
    assert.strictEqual(fetchMockCalls.length, 1);
    assert.strictEqual(fetchMockCalls[0].model, "google/gemini-2.5-flash");
  });

  test("Gemini Flash times out on 1st attempt → retries and succeeds on 2nd attempt", async () => {
    setupFetchMock([
      { shouldTimeout: true }, // 1st attempt times out
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "Success Content on Retry",
              },
            },
          ],
          usage: {
            total_tokens: 200,
          },
        },
      }, // 2nd attempt succeeds
    ]);

    const result = await callOpenRouter({
      prompt: "Test Prompt",
    });

    assert.deepStrictEqual(result, {
      success: true,
      content: "Success Content on Retry",
      tokensUsed: 200,
    });
    assert.strictEqual(fetchMockCalls.length, 2);
    assert.strictEqual(fetchMockCalls[0].model, "google/gemini-2.5-flash");
    assert.strictEqual(fetchMockCalls[1].model, "google/gemini-2.5-flash");
  });

  test("Gemini Flash fails both attempts → throws error", async () => {
    setupFetchMock([
      { shouldTimeout: true }, // 1st attempt times out
      { shouldTimeout: true }, // 2nd attempt times out
    ]);

    await assert.rejects(
      async () => {
        await callOpenRouter({
          prompt: "Test Prompt",
        });
      },
      (err) => {
        assert.ok(err.message.includes("timed out") || err.message.includes("aborted"));
        return true;
      }
    );

    assert.strictEqual(fetchMockCalls.length, 2);
    assert.strictEqual(fetchMockCalls[0].model, "google/gemini-2.5-flash");
    assert.strictEqual(fetchMockCalls[1].model, "google/gemini-2.5-flash");
  });

  test("Missing OPENROUTER_API_KEY env var → throws on module load", async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      await assert.rejects(
        () => import(`../services/ai/geminiClient.js?t=${Date.now()}`),
        (err) => {
          assert.strictEqual(
            err.message,
            "[geminiClient] OPENROUTER_API_KEY is not set in environment variables."
          );
          return true;
        }
      );
    } finally {
      process.env.OPENROUTER_API_KEY = originalKey;
    }
  });
});
