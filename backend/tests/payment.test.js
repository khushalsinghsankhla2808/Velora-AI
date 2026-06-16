/**
 * Velora AI - Razorpay Payment Flow Integration Tests
 *
 * What this file tests:
 * - POST /api/payment/create-order (Create Razorpay payment order)
 *   - Success paths for "pro" (201) and "enterprise" (201) plans when authenticated
 *   - Authentication failures when no auth cookie is present (401)
 *   - Input validation failures for missing/invalid planId (422 with VALIDATION_ERROR)
 *   - Payment gateway initialization failures when Razorpay SDK throws (500 with PAYMENT_INIT_FAILED)
 *
 * - POST /api/payment/verify (Verify Razorpay payment signature & credit user)
 *   - Success paths for "pro" (increases credits by 500) and "enterprise" (increases credits by 1000) plans with valid HMAC signature
 *   - Persistence check that credits are correctly saved to the in-memory MongoDB
 *   - Authentication failures when unauthenticated (401)
 *   - Signature verification failures for invalid HMAC signature (400 with INVALID_SIGNATURE)
 *   - Signature verification failures for tampered payment payload (400 with INVALID_SIGNATURE)
 *   - Missing request field validations for missing signature / order id (422 with VALIDATION_ERROR)
 *   - Double spend/replay protection against duplicate payment verifications (409 with DUPLICATE_PAYMENT)
 *
 * How to run:
 *   cd backend && npm test
 *
 * What external services are mocked:
 *   - Razorpay API Client (fully stubbed with jest.fn())
 *   - express-rate-limit security middlewares (bypassed to prevent 429 errors in tests)
 *   - MongoDB Database (uses mongodb-memory-server)
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import cookieParser from "cookie-parser";

// Declare mock modules before importing actual dependencies
jest.unstable_mockModule("../config/razorpay.js", () => {
  return {
    default: {
      orders: {
        create: jest.fn(),
      },
    },
  };
});

jest.unstable_mockModule("../middlewares/security.js", () => {
  const mockMiddleware = (req, res, next) => next();
  return {
    paymentLimiter: mockMiddleware,
    globalLimiter: mockMiddleware,
    generateLimiter: mockMiddleware,
    updateLimiter: mockMiddleware,
    securityHeaders: mockMiddleware,
    corsOptions: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    },
    rateLimitKeyGenerator: (req) => req.ip || "unknown",
  };
});

// Import dynamically to ensure the mocks are applied first
const { default: razorpayInstance } = await import("../config/razorpay.js");
const { User } = await import("../models/userModel.js");
const { Payment } = await import("../models/paymentModel.js");
const { default: paymentRoute } = await import("../routes/paymentRoute.js");

// Set up an isolated app mounting the payment routes to bypass Firebase/jose ESM require errors in Jest
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/payment", paymentRoute);

const originalStartSession = mongoose.startSession;

describe("Razorpay Payment Integration Tests", () => {
  let mongoServer;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Start mongodb-memory-server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Connect Mongoose to the in-memory database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    // Mock startSession to bypass replica set transaction requirement locally
    mongoose.startSession = async (...args) => {
      const session = await originalStartSession.apply(mongoose, args);
      session.startTransaction = () => {};
      session.commitTransaction = () => {};
      session.abortTransaction = () => {};
      session.inTransaction = () => false;
      return session;
    };
  });

  afterAll(async () => {
    // Restore sessions, disconnect, and stop server
    mongoose.startSession = originalStartSession;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all mock call histories
    jest.clearAllMocks();

    // Clean up collections to ensure test isolation
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

    // Generate valid JWT token for auth cookie
    authToken = jwt.sign(
      { id: testUser._id.toString() },
      process.env.JWT_SECRET || "mysecretkey"
    );
  });

  describe("POST /api/payment/create-order", () => {
    test("should return 201 when valid planId 'pro' and authenticated", async () => {
      razorpayInstance.orders.create.mockResolvedValue({
        id: "order_mock_pro_123",
        amount: 49900,
        currency: "INR",
        status: "created",
      });

      const response = await request(app)
        .post("/api/payment/create-order")
        .set("Cookie", `token=${authToken}`)
        .send({ planId: "pro" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBe("order_mock_pro_123");

      // Verify db order creation
      const payment = await Payment.findOne({ userId: testUser._id });
      expect(payment).not.toBeNull();
      expect(payment.planId).toBe("pro");
      expect(payment.status).toBe("pending");
      expect(payment.amount).toBe(499);
    });

    test("should return 201 when valid planId 'enterprise' and authenticated", async () => {
      razorpayInstance.orders.create.mockResolvedValue({
        id: "order_mock_ent_123",
        amount: 149900,
        currency: "INR",
        status: "created",
      });

      const response = await request(app)
        .post("/api/payment/create-order")
        .set("Cookie", `token=${authToken}`)
        .send({ planId: "enterprise" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBe("order_mock_ent_123");

      const payment = await Payment.findOne({ userId: testUser._id });
      expect(payment).not.toBeNull();
      expect(payment.planId).toBe("enterprise");
      expect(payment.status).toBe("pending");
      expect(payment.amount).toBe(1499);
    });

    test("should return 401 when no auth cookie", async () => {
      const response = await request(app)
        .post("/api/payment/create-order")
        .send({ planId: "pro" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("TOKEN_NOT_FOUND");
    });

    test("should return 422 when planId 'invalid'", async () => {
      const response = await request(app)
        .post("/api/payment/create-order")
        .set("Cookie", `token=${authToken}`)
        .send({ planId: "invalid" });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("should return 422 when missing planId entirely", async () => {
      const response = await request(app)
        .post("/api/payment/create-order")
        .set("Cookie", `token=${authToken}`)
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("should return 500 when Razorpay SDK throws", async () => {
      razorpayInstance.orders.create.mockRejectedValue(new Error("SDK Connection Issue"));

      const response = await request(app)
        .post("/api/payment/create-order")
        .set("Cookie", `token=${authToken}`)
        .send({ planId: "pro" });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("PAYMENT_INIT_FAILED");
    });
  });

  describe("POST /api/payment/verify", () => {
    test("should return 200 when valid HMAC signature and pro plan", async () => {
      const orderId = "order_pro_verify_99";
      const paymentId = "pay_pro_verify_99";

      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: orderId,
        status: "pending",
      });

      const body = orderId + "|" + paymentId;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET || "razorpaysecret")
        .update(body)
        .digest("hex");

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Cookie", `token=${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify that credits are persisted to MongoDB
      const user = await User.findById(testUser._id);
      expect(user.credits).toBe(600);
      expect(user.plan).toBe("pro");

      const dbPayment = await Payment.findOne({ razorpayOrderId: orderId });
      expect(dbPayment.status).toBe("paid");
      expect(dbPayment.razorpayPaymentId).toBe(paymentId);
    });

    test("should return 200 when valid HMAC signature and enterprise plan", async () => {
      const orderId = "order_ent_verify_99";
      const paymentId = "pay_ent_verify_99";

      await Payment.create({
        userId: testUser._id,
        planId: "enterprise",
        amount: 1499,
        credits: 1000,
        razorpayOrderId: orderId,
        status: "pending",
      });

      const body = orderId + "|" + paymentId;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET || "razorpaysecret")
        .update(body)
        .digest("hex");

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Cookie", `token=${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify DB persistence
      const user = await User.findById(testUser._id);
      expect(user.credits).toBe(1100);
      expect(user.plan).toBe("enterprise");

      const dbPayment = await Payment.findOne({ razorpayOrderId: orderId });
      expect(dbPayment.status).toBe("paid");
    });

    test("should return 400 when invalid HMAC signature", async () => {
      const orderId = "order_invalid_sig";
      const paymentId = "pay_invalid_sig";

      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: orderId,
        status: "pending",
      });

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Cookie", `token=${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: "this_is_an_invalid_mock_signature_that_exceeds_minimum_size",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_SIGNATURE");
    });

    test("should return 400 when tampered razorpay_payment_id", async () => {
      const orderId = "order_tampered";
      const paymentId = "pay_tampered";

      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: orderId,
        status: "pending",
      });

      // Sign correct body
      const body = orderId + "|" + paymentId;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET || "razorpaysecret")
        .update(body)
        .digest("hex");

      // Send a tampered payment ID with the signature of the non-tampered body
      const response = await request(app)
        .post("/api/payment/verify")
        .set("Cookie", `token=${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: "pay_tampered_id_different",
          razorpay_signature: signature,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_SIGNATURE");
    });

    test("should return 422 when missing razorpay_signature", async () => {
      const response = await request(app)
        .post("/api/payment/verify")
        .set("Cookie", `token=${authToken}`)
        .send({
          razorpay_order_id: "order_12345",
          razorpay_payment_id: "pay_12345",
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("should return 422 when missing razorpay_order_id", async () => {
      const response = await request(app)
        .post("/api/payment/verify")
        .set("Cookie", `token=${authToken}`)
        .send({
          razorpay_payment_id: "pay_12345",
          razorpay_signature: "signature_12345_67890_abcde_fghij",
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("should return 409 when duplicate payment (same orderId verified twice)", async () => {
      const orderId = "order_duplicate";
      const paymentId = "pay_duplicate";

      // Seed order as already paid
      await Payment.create({
        userId: testUser._id,
        planId: "pro",
        amount: 499,
        credits: 500,
        razorpayOrderId: orderId,
        status: "paid",
      });

      const body = orderId + "|" + paymentId;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET || "razorpaysecret")
        .update(body)
        .digest("hex");

      const response = await request(app)
        .post("/api/payment/verify")
        .set("Cookie", `token=${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("DUPLICATE_PAYMENT");
    });

    test("should return 401 when unauthenticated", async () => {
      const response = await request(app)
        .post("/api/payment/verify")
        .send({
          razorpay_order_id: "order_12345",
          razorpay_payment_id: "pay_12345",
          razorpay_signature: "signature_12345_67890_abcde_fghij",
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
