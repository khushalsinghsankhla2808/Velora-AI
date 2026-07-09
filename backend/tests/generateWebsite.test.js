// PATH: backend/tests/generateWebsite.test.js
import "./setup.js";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from "../index.js";

describe("Generate Website API Endpoint Tests", () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  let fetchMockCalls = [];

  beforeEach(() => {
    fetchMockCalls = [];
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  const setupFetchMock = (responses) => {
    let callIndex = 0;
    globalThis.fetch = async (url, options) => {
      fetchMockCalls.push({ url, options });
      const currentResponse = responses[callIndex];
      callIndex++;

      return {
        ok: currentResponse.ok !== false,
        status: currentResponse.status || 200,
        text: async () => currentResponse.text || "",
        json: async () => currentResponse.json || {},
      };
    };
  };

  test("should generate website HTML content using Gemini model", async () => {
    setupFetchMock([
      {
        ok: true,
        json: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "<html><body><h1>Coffee Shop</h1></body></html>"
                  }
                ]
              }
            }
          ]
        }
      }
    ]);

    const res = await request(app)
      .post("/api/generate-website")
      .send({ prompt: "A coffee shop landing page", style: "html-css-js" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.html, "<html><body><h1>Coffee Shop</h1></body></html>");
    assert.ok(fetchMockCalls[0].url.includes("generativelanguage.googleapis.com"));
  });
});

