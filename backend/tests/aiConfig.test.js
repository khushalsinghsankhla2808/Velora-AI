import "./setup.js";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { callAIWithFallback } from "../config/openRouter.js";

describe("AI Fallback Model Integration Tests", () => {
  const originalFetch = globalThis.fetch;
  let fetchMockCalls = [];

  beforeEach(() => {
    fetchMockCalls = [];
    // Set custom configurations for test execution
    process.env.AI_PRIMARY_MODEL = "google/gemini-2.5-flash";
    process.env.AI_FALLBACK_MODEL = "google/gemini-2.5-flash";
    process.env.AI_TIMEOUT_MS = "100"; // Short timeout for quick checks
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
      fetchMockCalls.push({ url, model: parsedBody.model });

      const currentResponse = responses[callIndex];
      callIndex++;

      if (!currentResponse) {
        throw new Error("No mocked response defined for this call");
      }

      if (currentResponse.shouldTimeout) {
        // Delay execution beyond the timeout limit to trigger abort
        await new Promise((resolve) => setTimeout(resolve, 250));
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

  test("should return content from primary model on success", async () => {
    setupFetchMock([
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: JSON.stringify({ message: "Generated successfully", files: [{ path: "index.html", content: "<html>Primary</html>" }] }),
              },
            },
          ],
        },
      },
    ]);

    const prompt = "Build a portfolio landing page";
    const result = await callAIWithFallback(prompt, { userId: "user_test_success" });

    assert.ok(result);
    const parsed = JSON.parse(result);
    assert.strictEqual(parsed.files[0].content, "<html>Primary</html>");
    assert.strictEqual(fetchMockCalls.length, 1);
    assert.strictEqual(fetchMockCalls[0].model, "google/gemini-2.5-flash");
  });

  test("should fall back to secondary model when primary times out", async () => {
    setupFetchMock([
      { shouldTimeout: true }, // Primary times out
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: JSON.stringify({ message: "Generated with fallback", files: [{ path: "index.html", content: "<h1>Fallback</h1>" }] }),
              },
            },
          ],
        },
      }, // Fallback succeeds
    ]);

    const prompt = "Build a portfolio landing page";
    const result = await callAIWithFallback(prompt, { userId: "user_test_timeout" });

    assert.ok(result);
    const parsed = JSON.parse(result);
    assert.strictEqual(parsed.files[0].content, "<h1>Fallback</h1>");
    assert.strictEqual(fetchMockCalls.length, 2);
    assert.strictEqual(fetchMockCalls[0].model, "google/gemini-2.5-flash");
    assert.strictEqual(fetchMockCalls[1].model, "google/gemini-2.5-flash");
  });

  test("should fall back to secondary model when primary returns invalid JSON", async () => {
    setupFetchMock([
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "Raw text that is not a JSON block",
              },
            },
          ],
        },
      }, // Primary returns invalid JSON
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: JSON.stringify({ message: "Generated with fallback", files: [{ path: "index.html", content: "<h1>Fallback JSON</h1>" }] }),
              },
            },
          ],
        },
      }, // Fallback succeeds
    ]);

    const prompt = "Build a portfolio landing page";
    const result = await callAIWithFallback(prompt, { userId: "user_test_invalid_json" });

    assert.ok(result);
    const parsed = JSON.parse(result);
    assert.strictEqual(parsed.files[0].content, "<h1>Fallback JSON</h1>");
    assert.strictEqual(fetchMockCalls.length, 2);
    assert.strictEqual(fetchMockCalls[0].model, "google/gemini-2.5-flash");
    assert.strictEqual(fetchMockCalls[1].model, "google/gemini-2.5-flash");
  });

  test("should throw AI_UNAVAILABLE error when both models fail", async () => {
    setupFetchMock([
      { networkError: true }, // Primary fails
      { networkError: true }, // Fallback fails
    ]);

    const prompt = "Build a portfolio landing page";
    let thrownError = null;

    try {
      await callAIWithFallback(prompt, { userId: "user_test_double_fail" });
    } catch (error) {
      thrownError = error;
    }

    assert.ok(thrownError);
    assert.strictEqual(thrownError.code, "AI_UNAVAILABLE");
    assert.strictEqual(thrownError.message, "AI service temporarily unavailable");
    assert.strictEqual(fetchMockCalls.length, 2);
    assert.strictEqual(fetchMockCalls[0].model, "google/gemini-2.5-flash");
    assert.strictEqual(fetchMockCalls[1].model, "google/gemini-2.5-flash");
  });
});
