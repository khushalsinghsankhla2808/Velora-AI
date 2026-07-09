// PATH: backend/tests/generateWebsite.test.js
import "./setup.js";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from "../index.js";

describe("Generate Website API Endpoint Tests", () => {
  const originalFetch = globalThis.fetch;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  let fetchMockCalls = [];

  beforeEach(() => {
    fetchMockCalls = [];
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
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

  test("should generate website using Gemini fallback when OpenRouter key is mock or missing", async () => {
    process.env.OPENROUTER_API_KEY = "mock_openrouter_api_key";
    
    // Setup Gemini mock response structure
    setupFetchMock([
      {
        ok: true,
        json: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      project: { name: "test-app", description: "a test app" },
                      files: [{ path: "src/App.jsx", content: "export default function App() {}", type: "frontend" }]
                    })
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
      .send({ prompt: "A portfolio page", style: "minimal" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.project.name, "test-app");
    assert.strictEqual(res.body.files.length, 1);
    
    // Verify it called generative language API (Gemini)
    assert.ok(fetchMockCalls[0].url.includes("generativelanguage.googleapis.com"));
  });

  test("should generate website using OpenRouter when API key is configured", async () => {
    process.env.OPENROUTER_API_KEY = "real_openrouter_key";

    // Setup OpenRouter mock response structure
    setupFetchMock([
      {
        ok: true,
        json: {
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  project: { name: "openrouter-app", description: "via openrouter" },
                  files: [{ path: "index.html", content: "<h1>Hello</h1>", type: "frontend" }]
                })
              }
            }
          ]
        }
      }
    ]);

    const res = await request(app)
      .post("/api/generate-website")
      .send({ prompt: "An openrouter app", model: "openai/gpt-4o-mini", style: "modern" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.project.name, "openrouter-app");
    assert.strictEqual(res.body.files.length, 1);

    // Verify it called openrouter endpoint
    assert.ok(fetchMockCalls[0].url.includes("openrouter.ai/api/v1/chat/completions"));
    const body = JSON.parse(fetchMockCalls[0].options.body);
    assert.strictEqual(body.model, "openai/gpt-4o-mini");
    assert.ok(body.messages[0].content.includes("Style preference to follow strictly"));
  });
});
