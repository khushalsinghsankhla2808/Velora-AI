// PATH: backend/index.js

import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./database/db.js";
import authRoute from "./routes/authRoutes.js";
import websiteRoute from "./routes/websiteRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import creditRoute from "./routes/creditRoute.js";

const app = express();
const PORT = process.env.PORT || 8000;

// ======================================
// Firebase Popup Fix
// ======================================
app.use((req, res, next) => {
  res.setHeader(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups"
  );
  next();
});

// ======================================
// Middleware
// ======================================
app.use(express.json());
app.use(cookieParser());

// ======================================
// Request Logger
// ======================================
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log("Origin:", req.headers.origin);
  next();
});

// ======================================
// CORS (Temporary Debug Version)
// ======================================
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ======================================
// Health Check Route
// ======================================
app.get("/", (req, res) => {
  res.status(200).send("Velora AI Backend Running 🚀");
});

// ======================================
// API Routes
// ======================================
app.use("/api/auth", authRoute);
app.use("/api/website", websiteRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/credits", creditRoute);

// ======================================
// Global Error Handler
// ======================================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ======================================
// Start Server
// ======================================
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Startup Error:", error);
    process.exit(1);
  }
};

startServer();