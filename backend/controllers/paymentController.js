import mongoose from "mongoose";
import crypto from "crypto";
import razorpayInstance from "../config/razorpay.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { Payment } from "../models/paymentModel.js";
import { User } from "../models/userModel.js";
import { PLANS } from "../config/plan.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { validateText } from "../utils/validation.js";

export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const planValidation = validateText({
      value: planId,
      field: "Plan",
      min: 3,
      max: 30,
    });

    if (!planValidation.valid) {
      return sendError(res, "INVALID_PLAN", planValidation.message, 400);
    }

    const plan = PLANS[planValidation.value];

    if (!plan || plan.price <= 0) {
      return sendError(res, "INVALID_PLAN", "Invalid plan data", 400);
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(plan.price * 100),
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    await Payment.create({
      userId: req.user._id,
      planId: planValidation.value,
      amount: plan.price,
      credits: plan.credits,
      razorpayOrderId: razorpayOrder.id,
      status: "pending",
    });

    return sendSuccess(res, { order: razorpayOrder }, 201);
  } catch (error) {
    return sendError(res, "PAYMENT_INIT_FAILED", error.message, 500);
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const orderValidation = validateText({
      value: razorpay_order_id,
      field: "Razorpay order id",
      min: 5,
      max: 100,
    });
    const paymentValidation = validateText({
      value: razorpay_payment_id,
      field: "Razorpay payment id",
      min: 5,
      max: 100,
    });
    const signatureValidation = validateText({
      value: razorpay_signature,
      field: "Razorpay signature",
      min: 20,
      max: 200,
    });

    if (
      !orderValidation.valid ||
      !paymentValidation.valid ||
      !signatureValidation.valid
    ) {
      return sendError(res, "INVALID_PAYMENT_PAYLOAD", "Payment verification payload is invalid", 400);
    }

    const verifiedOrderId = orderValidation.value;
    const verifiedPaymentId = paymentValidation.value;
    const verifiedSignature = signatureValidation.value;
    const body = verifiedOrderId + "|" + verifiedPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== verifiedSignature) {
      return sendError(res, "INVALID_SIGNATURE", "Invalid Payment Signature", 400);
    }

    const payment = await Payment.findOne({
      razorpayOrderId: verifiedOrderId,
    });

    if (!payment) {
      return sendError(res, "PAYMENT_NOT_FOUND", "Payment not found", 404);
    }

    if (payment.status === "paid") {
      return sendError(res, "DUPLICATE_PAYMENT", "Payment already processed", 409);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      payment.status = "paid";
      payment.razorpayPaymentId = verifiedPaymentId;
      await payment.save({ session });

      const updatedUser = await User.findByIdAndUpdate(
        payment.userId,
        { $inc: { credits: payment.credits }, $set: { plan: payment.planId } },
        { new: true, session },
      );

      if (!updatedUser) {
        throw new Error("User update failed during payment verification");
      }

      await CreditTransaction.create(
        [
          {
            user: payment.userId,
            type: "credit",
            amount: payment.credits,
            balanceAfter: updatedUser.credits,
            reason: "plan_purchase",
            description: `${payment.planId} plan purchase`,
            referenceId: payment._id.toString(),
            metadata: {
              razorpayOrderId: payment.razorpayOrderId,
              razorpayPaymentId: payment.razorpayPaymentId,
            },
          },
        ],
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      return sendSuccess(res, {
        message: "Payment verified and credits added",
        user: updatedUser,
      });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (error) {
    return sendError(res, "PAYMENT_VERIFY_FAILED", error.message, 500);
  }
};
