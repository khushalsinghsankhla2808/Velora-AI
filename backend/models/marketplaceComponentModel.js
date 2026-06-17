// PATH: backend/models/marketplaceComponentModel.js
import mongoose from "mongoose";

const marketplaceComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["Header", "Footer", "Hero", "Pricing", "Form", "Card", "Navigation", "Custom"],
      default: "Custom",
    },
    code: {
      type: String,
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [{ type: String }],
    previewUrl: String,
  },
  { timestamps: true }
);

marketplaceComponentSchema.index({ category: 1 });
marketplaceComponentSchema.index({ createdAt: -1 });

export const MarketplaceComponent = mongoose.model("MarketplaceComponent", marketplaceComponentSchema);
