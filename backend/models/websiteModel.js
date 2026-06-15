// PATH: backend/models/websiteModel.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "ai"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

const websiteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, default: "Untitled Website" },
    latestCode: String,
    conversation: [messageSchema],
    deployed: { type: Boolean, default: false },
    deployUrl: String,
    slug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

websiteSchema.index({ user: 1, updatedAt: -1 });
websiteSchema.index({ slug: 1, deployed: 1 });

export const Website = mongoose.model("Website", websiteSchema);
