import "dotenv/config";
import "./setup.js";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

// Ensure a mock key is set for testing
if (!process.env.MISTRAL_API_KEY) {
  process.env.MISTRAL_API_KEY = "mock-mistral-key";
}

import { mistralComplete, mistralChat, mistralJSON } from "../utils/mistralClient.js";

describe("Mistral Client Utility Tests", () => {
  const originalFetch = globalThis.fetch;
  let fetchMockCalls = [];

  beforeEach(() => {
    fetchMockCalls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const setupFetchMock = (responses) => {
    let callIndex = 0;
    globalThis.fetch = async (url, options) => {
      fetchMockCalls.push({ url, options });
      const currentResponse = responses[callIndex];
      callIndex++;

      if (!currentResponse) {
        throw new Error("No mocked response defined for this call");
      }

      return {
        ok: currentResponse.ok !== false,
        status: currentResponse.status || 200,
        text: async () => currentResponse.text || "",
        json: async () => currentResponse.json || {},
      };
    };
  };

  test("mistralComplete returns text content correctly", async () => {
    setupFetchMock([
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "Hello from Mistral"
              }
            }
          ]
        }
      }
    ]);

    const res = await mistralComplete("system instruction", "user message");
    assert.strictEqual(res, "Hello from Mistral");
    assert.strictEqual(fetchMockCalls.length, 1);
    assert.ok(fetchMockCalls[0].url.includes("api.mistral.ai"));
  });

  test("mistralChat translates messages and handles multi-turn response", async () => {
    setupFetchMock([
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "Chat conversation response"
              }
            }
          ]
        }
      }
    ]);

    const res = await mistralChat("system", [{ role: "user", content: "hi" }], "hello");
    assert.strictEqual(res, "Chat conversation response");
    assert.strictEqual(fetchMockCalls.length, 1);
    assert.ok(fetchMockCalls[0].url.includes("api.mistral.ai"));
  });

  test("mistralJSON strips markdown and parses clean JSON object", async () => {
    setupFetchMock([
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                content: "```json\n{\n  \"files\": []\n}\n```"
              }
            }
          ]
        }
      }
    ]);

    const res = await mistralJSON("system", "prompt");
    assert.deepStrictEqual(res, { files: [] });
    assert.strictEqual(fetchMockCalls.length, 1);
    assert.ok(fetchMockCalls[0].url.includes("api.mistral.ai"));
  });
});
