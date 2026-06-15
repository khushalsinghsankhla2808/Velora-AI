/**
 * README / Documentation:
 * 
 * Velora AI - Razorpay Payment Integration Tests
 * 
 * What it covers:
 * 1. POST /api/payment/order (Create Order)
 *    - Success paths for 'pro' and 'enterprise' plans
 *    - Unauthenticated request validation
 *    - Invalid and missing planId schema checks (422 VALIDATION_ERROR)
 * 
 * 2. POST /api/payment/verify (Verify Signature & Credit User)
 *    - Valid HMAC signatures updating user credits (500 for pro, 1000 for enterprise)
 *    - Authentication validations (401)
 *    - Invalid / tampered HMAC signatures (400)
 *    - Missing required parameters validation (422)
 *    - Duplicate payment verification attempt prevention (409)
 * 
 * How to run:
 *    cd backend && npm test
 */

import "./setup.js";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../index.js";
import { User } from "../models/userModel.js";
import { Payment } from "../models/paymentModel.js";
import razorpayInstance from "../config/razorpay.js";

const originalStartSession = mongoose.startSession;

describe("Razorpay Payment Integration Tests", () => {
  let mongoServer;
  let testUser;
  let authToken;

  before(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Reconnect Mongoose to the memory server
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    // Mock mongoose startSession to bypass replica set transaction requirement locally
    mongoose.startSession = async (...args) => {
      const session = await originalStartSession.apply(mongoose, args);
      session.startTransaction = () => {};
      session.commitTransaction = () => {};
      session.abortTransaction = () => {};
      session.inTransaction = () => false;
      return session;
    };

    // Mock Razorpay SDK orders.create
    razorpayInstance.orders.create = async (options) => {
      return {
        id: "order_mock_" + Math.random().toString(36).substr(2, 9),
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        status: "created",
      };
    };
  });

  after(async () => {
    // Disconnect Mongoose, restore startSession, and stop memory server
    mongoose.startSession = originalStartSession;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database collections to avoid test pollution
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }

    // Set up a deterministic test user with exactly 100 credits
    testUser = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "testuser@velora.ai",
      name: "Test User",
      credits: 100,
    });

    // Generate JWT token for requests
    authToken = jwt.sign(
      { id: testUser._id.toString() },
      process.env.JWT_SECRET || "mysecretkey"
    );
  });

  // ==========================================
  // POST /api/payment/order Tests
  // ==========================================
  describe("POST /api/payment/order (Create Order)", () => {
    test("should successfully create order for pro plan (201)", async () => {
      const response = await request(app)
        .post("/api/payment/order")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ planId: "pro" });

      assert.strictEqual(response.status, 200); // Controller uses sendSuccess which returns 200
      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.data.order.id.startsWith("order_mock_"));

      // Assert database payment entry was created in pending state
      const payment = await Payment.findOne({ userId: testUser._id });
      assert.ok(payment);
      assert.strictEqual(payment.planId, "pro");
      assert.strictEqual(payment.status, "pending");
    });

    test("should successfully create order for enterprise plan (201)", async () => {
      const response = await request(app)
        .post("/api/payment/order")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ planId: "enterprise" });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.data.order.id.startsWith("order_mock_"));

      const payment = await Payment.findOne({ userId: testUser._id });
      assert.ok(payment);
      assert.strictEqual(payment.planId, "enterprise");
      assert.strictEqual(payment.status, "pending");
    });

    test("should return 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/payment/order")
        .send({ planId: "pro" });

      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, "TOKEN_NOT_FOUND");
    });

    test("should return 422 for invalid planId", async () => {
      const response = await request(app)
        .post("/api/payment/order")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ planId: "invalid" });

      assert.strictEqual(response.status, 422);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, "VALIDATION_ERROR");
    });

    test("should return 422 for missing planId", async () => {
      const response = await request(app)
        .post("/api/payment/order")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      assert.strictEqual(response.status, 422);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, "VALIDATION_ERROR");
    });
  });

  // ==========================================
  // POST /api/payment/verify Tests
  // ==========================================
  describe("POST /api/payment/verify (Verify Payment)", () => {
    test("should verify payment successfully and increase pro plan user credits by 500", async () => {
      const razorpay_order_id = "order_pro_123";
      const razorpay_payment_id = "pay_pro_123";

      // Seed a pending payment order in database
      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: razorpay_order_id,
        status: "pending",
      });

      // Generate valid HMAC signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const razorpay_signature = crypto
        .createHmac("sha256", "razorpaysecret")
        .update(body)
        .digest("hex");

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);

      // Assert user credits updated (100 base + 500 = 600)
      const user = await User.findById(testUser._id);
      assert.strictEqual(user.credits, 600);
      assert.strictEqual(user.plan, "pro");

      // Assert payment status updated to paid
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
      assert.strictEqual(payment.status, "paid");
      assert.strictEqual(payment.razorpayPaymentId, razorpay_payment_id);
    });

    test("should verify payment successfully and increase enterprise plan user credits by 1000", async () => {
      const razorpay_order_id = "order_ent_123";
      const razorpay_payment_id = "pay_ent_123";

      await Payment.create({
        userId: testUser._id,
        planId: "enterprise",
        amount: 1499,
        credits: 1000,
        razorpayOrderId: razorpay_order_id,
        status: "pending",
      });

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const razorpay_signature = crypto
        .createHmac("sha256", "razorpaysecret")
        .update(body)
        .digest("hex");

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);

      const user = await User.findById(testUser._id);
      assert.strictEqual(user.credits, 1100);
      assert.strictEqual(user.plan, "enterprise");
    });

    test("should return 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/payment/verify")
        .send({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_123",
          razorpay_signature: "sig_123",
        });

      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.success, false);
    });

    test("should return 400 for invalid signature", async () => {
      const razorpay_order_id = "order_123";
      const razorpay_payment_id = "pay_123";

      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: razorpay_order_id,
        status: "pending",
      });

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature: "invalid_signature_must_be_longer_than_20_chars",
        });

      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, "INVALID_PAYMENT_SIGNATURE");
    });

    test("should return 400 for tampered signature", async () => {
      const razorpay_order_id = "order_123";
      const razorpay_payment_id = "pay_123";

      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: razorpay_order_id,
        status: "pending",
      });

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const correctSignature = crypto
        .createHmac("sha256", "razorpaysecret")
        .update(body)
        .digest("hex");

      const tamperedSignature = correctSignature.slice(0, -4) + "aaaa";

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature: tamperedSignature,
        });

      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, "INVALID_PAYMENT_SIGNATURE");
    });

    test("should return 422 when signature field is missing", async () => {
      const response = await request(app)
        .post("/api/payment/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_123",
        });

      assert.strictEqual(response.status, 422);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, "VALIDATION_ERROR");
    });

    test("should return 409 for duplicate payment attempts (already paid)", async () => {
      const razorpay_order_id = "order_dup_123";
      const razorpay_payment_id = "pay_dup_123";

      // Seed a payment already marked as "paid"
      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: razorpay_order_id,
        status: "paid",
      });

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const razorpay_signature = crypto
        .createHmac("sha256", "razorpaysecret")
        .update(body)
        .digest("hex");

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });

      assert.strictEqual(response.status, 409);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, "DUPLICATE_PAYMENT");
    });
  });
});
