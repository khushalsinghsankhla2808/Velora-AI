import "./setup.js";
import { test, describe, before, afterEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import app from "../index.js";
import { User } from "../models/userModel.js";
import { Payment } from "../models/paymentModel.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";

// Save original methods
const originalFindById = User.findById;
const originalFindByIdAndUpdate = User.findByIdAndUpdate;
const originalFindOne = Payment.findOne;
const originalCreateTransaction = CreditTransaction.create;
const originalStartSession = mongoose.startSession;

describe("Payment Verification API", () => {
  let authToken;

  before(() => {
    authToken = jwt.sign({ id: "mockuser123" }, "mysecretkey");
    
    // Mock mongoose startSession
    mongoose.startSession = async () => ({
      startTransaction: () => {},
      commitTransaction: () => {},
      abortTransaction: () => {},
      endSession: () => {},
    });
  });

  afterEach(() => {
    User.findById = originalFindById;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
    Payment.findOne = originalFindOne;
    CreditTransaction.create = originalCreateTransaction;
  });

  test("should return 400 when signature validation fails", async () => {
    // Arrange
    const payload = {
      razorpay_order_id: "order_12345",
      razorpay_payment_id: "pay_12345",
      razorpay_signature: "invalid_signature_length_longer_than_20_chars_to_pass_zod",
    };

    User.findById = async () => ({ _id: "mockuser123", credits: 100 });

    // Act
    const response = await request(app)
      .post("/api/payment/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    // Assert
    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, "INVALID_PAYMENT_SIGNATURE");
  });

  test("should return 400 when validation fails due to missing fields", async () => {
    // Arrange
    const payload = {
      razorpay_order_id: "order_12345",
    };

    User.findById = async () => ({ _id: "mockuser123", credits: 100 });

    // Act
    const response = await request(app)
      .post("/api/payment/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    // Assert
    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, "INVALID_PAYMENT_PAYLOAD");
  });

  test("should verify payment successfully and increment user credits", async () => {
    // Arrange
    const razorpay_order_id = "order_12345";
    const razorpay_payment_id = "pay_12345";
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const razorpay_signature = crypto
      .createHmac("sha256", "razorpaysecret")
      .update(body)
      .digest("hex");

    const payload = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    };

    const mockPayment = {
      _id: "payment123",
      userId: "mockuser123",
      planId: "pro",
      amount: 499,
      credits: 100,
      razorpayOrderId: razorpay_order_id,
      status: "pending",
      save: async () => true,
    };

    User.findById = async () => ({ _id: "mockuser123", credits: 100 });
    Payment.findOne = async () => mockPayment;
    User.findByIdAndUpdate = async () => ({ _id: "mockuser123", credits: 200 });
    CreditTransaction.create = async () => [{}];

    // Act
    const response = await request(app)
      .post("/api/payment/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    // Assert
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.message, "Payment verified and credits added");
    assert.strictEqual(response.body.data.user.credits, 200);
  });
});
