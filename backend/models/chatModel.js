// PATH: backend/models/chatModel.js
import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    filesChanged: [{ type: String }],
    tokensUsed: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Index chat history scoped by project and ordered chronologically
chatSchema.index({ projectId: 1, createdAt: 1 });

export const Chat = mongoose.model("Chat", chatSchema);
