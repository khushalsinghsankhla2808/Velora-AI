// PATH: backend/index.js

import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";

import { validateEnv, getAllowedOrigins } from "./config/env.js";
import connectDB from "./database/db.js";
import authRoute from "./routes/authRoutes.js";
import websiteRoute from "./routes/websiteRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import creditRoute from "./routes/creditRoute.js";
import { corsOptions, rateLimiter, securityHeaders } from "./middlewares/security.js";
import { sendError } from "./utils/apiResponse.js";

const app = express();
const PORT = process.env.PORT || 8000;

// ======================================
// Middleware
// ======================================
app.use(securityHeaders);
app.use(rateLimiter);
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
// CORS
// ======================================
app.use(cors(corsOptions));
// (Express 5: skip app.options wildcard here to avoid path-to-regexp errors)




// ======================================
// Health Check Route
// ======================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: "Velora AI Backend Running",
    },
  });
});

// ======================================
// API Routes
// ======================================
app.use("/api/auth", authRoute);
app.use("/api/website", websiteRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/credits", creditRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/website", websiteRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/credits", creditRoute);

// ======================================
// Global Error Handler
// ======================================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  const isCorsError = err.message === "Origin not allowed by CORS";
  const errorMessage = isCorsError
    ? `Origin not allowed by CORS: "${req.headers.origin}". Allowed: ${JSON.stringify(getAllowedOrigins())}`
    : (err.message || "Internal Server Error");

  return sendError(
    res,
    isCorsError ? "CORS_NOT_ALLOWED" : "INTERNAL_ERROR",
    errorMessage,
    isCorsError ? 403 : 500,
  );
});

// ======================================
// Start Server
// ======================================
const startServer = async () => {
  try {
    validateEnv();
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
