import mongoose from "mongoose";

const creditTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      enum: ["initial_bonus", "website_generation", "website_update", "plan_purchase", "website_chat"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

creditTransactionSchema.index({ user: 1, createdAt: -1 });

export const CreditTransaction = mongoose.model(
  "CreditTransaction",
  creditTransactionSchema,
);
