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
import generateWebsiteRouter from "./routes/generateWebsite.js";
import { corsOptions, globalLimiter, securityHeaders } from "./middlewares/security.js";
import { sendError } from "./utils/apiResponse.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Enable trust proxy for proxy-aware rate limiting (e.g. Render, Vercel deployments)
app.set("trust proxy", 1);

// ======================================
// Middleware
// ======================================
app.use(securityHeaders);
app.use(globalLimiter);
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
const allowedOrigins = [
  'https://velora-builder.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight for ALL routes
app.options(/(.*)/, cors());




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
app.use("/api/generate-website", generateWebsiteRouter);

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
    if (process.env.NODE_ENV !== "test") {
      await connectDB();

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
      });
    }
  } catch (error) {
    console.error("Startup Error:", error);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
};

startServer();

export default app;
