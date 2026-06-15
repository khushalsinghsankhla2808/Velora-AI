import { z } from "zod";

/**
 * Schema for validating payment order creation requests.
 * Allows passthrough of other fields.
 */
export const CreateOrderSchema = z.object({
  planId: z.enum(["pro", "enterprise"], {
    errorMap: () => ({ message: "Plan ID must be 'pro' or 'enterprise'" }),
  }),
}).passthrough();

/**
 * Schema for validating payment signature verification requests.
 * Allows passthrough of other fields.
 */
export const VerifySchema = z.object({
  razorpay_order_id: z.string({
    required_error: "Razorpay order ID is required",
  }),
  razorpay_payment_id: z.string({
    required_error: "Razorpay payment ID is required",
  }),
  razorpay_signature: z.string({
    required_error: "Razorpay signature is required",
  }),
}).passthrough();
