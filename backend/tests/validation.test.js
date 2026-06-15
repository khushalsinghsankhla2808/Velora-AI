import "./setup.js";
import { test, describe, before } from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from "../index.js";
import { validate } from "../middlewares/validate.js";
import { GenerateSchema, UpdateSchema, DeploySchema } from "../validators/websiteValidator.js";
import { CreateOrderSchema, VerifySchema } from "../validators/paymentValidator.js";

describe("Zod Validation Middleware Integration Tests", () => {
  before(() => {
    // Mount test routes with validation middleware for clean, isolated validation testing
    app.post("/api/test-val/generate", validate(GenerateSchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    app.post("/api/test-val/update/:id", validate(UpdateSchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    app.get("/api/test-val/deploy/:id", validate(DeploySchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    app.post("/api/test-val/payment-order", validate(CreateOrderSchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    app.post("/api/test-val/payment-verify", validate(VerifySchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });
  });

  describe("GenerateSchema Validation", () => {
    test("should pass validation with valid prompt", async () => {
      const payload = { prompt: "Build a modern startup SaaS landing page with dark mode." };
      const res = await request(app)
        .post("/api/test-val/generate")
        .send(payload);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test("should return 422 when prompt is too short", async () => {
      const payload = { prompt: "Short" };
      const res = await request(app)
        .post("/api/test-val/generate")
        .send(payload);

      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
      assert.strictEqual(res.body.error.message, "Invalid input");
      assert.ok(Array.isArray(res.body.error.details));
      assert.strictEqual(res.body.error.details[0].field, "prompt");
    });

    test("should return 422 when prompt is missing", async () => {
      const res = await request(app)
        .post("/api/test-val/generate")
        .send({});

      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
      assert.ok(res.body.error.details.some(d => d.field === "prompt"));
    });
  });

  describe("UpdateSchema Validation", () => {
    test("should pass validation with valid prompt and websiteId in path", async () => {
      const payload = { prompt: "Add pricing section" };
      const res = await request(app)
        .post("/api/test-val/update/507f1f77bcf86cd799439011")
        .send(payload);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test("should return 422 when websiteId in path is invalid", async () => {
      const payload = { prompt: "Add pricing section" };
      const res = await request(app)
        .post("/api/test-val/update/invalid-mongo-id")
        .send(payload);

      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.details.some(d => d.field === "websiteId"));
    });
  });

  describe("DeploySchema Validation", () => {
    test("should pass validation with valid websiteId", async () => {
      const res = await request(app)
        .get("/api/test-val/deploy/507f1f77bcf86cd799439011");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test("should return 422 when websiteId is invalid", async () => {
      const res = await request(app)
        .get("/api/test-val/deploy/invalid-id");

      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.details.some(d => d.field === "websiteId"));
    });
  });

  describe("CreateOrderSchema Validation", () => {
    test("should pass validation with valid planId", async () => {
      const res = await request(app)
        .post("/api/test-val/payment-order")
        .send({ planId: "pro" });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test("should return 422 with invalid planId", async () => {
      const res = await request(app)
        .post("/api/test-val/payment-order")
        .send({ planId: "invalid-plan" });

      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.details.some(d => d.field === "planId"));
    });
  });

  describe("VerifySchema Validation", () => {
    test("should pass validation with valid payment verify payload", async () => {
      const payload = {
        razorpay_order_id: "order_12345",
        razorpay_payment_id: "pay_12345",
        razorpay_signature: "sig_12345",
      };
      const res = await request(app)
        .post("/api/test-val/payment-verify")
        .send(payload);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test("should return 422 with missing fields", async () => {
      const payload = {
        razorpay_order_id: "order_12345",
      };
      const res = await request(app)
        .post("/api/test-val/payment-verify")
        .send(payload);

      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.details.some(d => d.field === "razorpay_payment_id"));
      assert.ok(res.body.error.details.some(d => d.field === "razorpay_signature"));
    });
  });
});
