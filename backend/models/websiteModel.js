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
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    conversation: [messageSchema],
    deployed: { type: Boolean, default: false },
    deployUrl: String,
    slug: { type: String, unique: true, sparse: true },
    forkedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Website" },
    stack: {
      type: String,
      enum: ["html-css-js", "react-vite", "nextjs", "express-mongodb"],
      default: "html-css-js"
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["owner", "editor", "viewer"], default: "editor" }
      }
    ],
    brand: {
      colors: { type: [String], default: ["#3b82f6", "#1e293b", "#0f172a"] },
      font: { type: String, default: "Inter, system-ui" },
      logoUrl: String,
    }
  },
  { timestamps: true },
);

websiteSchema.index({ user: 1, updatedAt: -1 });
websiteSchema.index({ slug: 1, deployed: 1 });

export const Website = mongoose.model("Website", websiteSchema);
