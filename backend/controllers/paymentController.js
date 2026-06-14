// PATH: backend/controllers/paymentController.js
import crypto from "crypto";
import razorpayInstance from "../config/razorpay.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { Payment } from "../models/paymentModel.js";
import { User } from "../models/userMODEL.js";
import { PLANS } from "../config/plan.js";

export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan || plan.price <= 0) {
      return res.status(400).json({ message: "Invalid plan data" });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(plan.price * 100),
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    await Payment.create({
      userId: req.user._id,
      planId,
      amount: plan.price,
      credits: plan.credits,
      razorpayOrderId: razorpayOrder.id,
      status: "pending",
    });

    return res.json(razorpayOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid Payment Signature" });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(400).json({ message: "Payment not found" });
    }

    if (payment.status === "paid") {
      return res.json({ message: "Already processed" });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    const updatedUser = await User.findByIdAndUpdate(
      payment.userId,
      { $inc: { credits: payment.credits }, $set: { plan: payment.planId } },
      { new: true },
    );
    await CreditTransaction.create({
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
    });

    return res.json({
      success: true,
      message: "Payment verified and credits added",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
