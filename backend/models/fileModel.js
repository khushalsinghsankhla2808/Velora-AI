// PATH: backend/models/fileModel.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of file path per project
fileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export const FileModel = mongoose.model("File", fileSchema);
