import "./setup.js";
import { test, describe, before } from "node:test";
import assert from "node:assert";
import request from "supertest";
import rateLimit from "express-rate-limit";
import app from "../index.js";
import { rateLimitKeyGenerator } from "../middlewares/security.js";

describe("Rate Limiting Integration Tests", () => {
  before(() => {
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      keyGenerator: rateLimitKeyGenerator,
      message: {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      },
      validate: false,
    });

    app.get("/api/test-rate-limit", testLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });
  });

  test("should allow requests under the rate limit threshold", async () => {
    const res1 = await request(app).get("/api/test-rate-limit");
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.success, true);

    const res2 = await request(app).get("/api/test-rate-limit");
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.success, true);
  });

  test("should return 429 and exact JSON payload when rate limit is exceeded", async () => {
    const res3 = await request(app).get("/api/test-rate-limit");
    assert.strictEqual(res3.status, 429);
    assert.deepStrictEqual(res3.body, {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      },
    });
  });
});
