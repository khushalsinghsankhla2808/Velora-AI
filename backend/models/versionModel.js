// PATH: backend/models/versionModel.js
import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      default: "Snapshot",
    },
    description: {
      type: String,
      default: "",
    },
    files: [
      {
        path: { type: String, required: true },
        content: { type: String, default: "" },
        language: { type: String, required: true },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Order versions chronologically by project
versionSchema.index({ projectId: 1, createdAt: -1 });

export const Version = mongoose.model("Version", versionSchema);
