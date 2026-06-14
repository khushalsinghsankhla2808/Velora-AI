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
// Allowed Origins
// ======================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  "https://velora-builder.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

console.log("Allowed Origins:", allowedOrigins);

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

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log("Origin:", req.headers.origin);
  next();
});

// ======================================
// CORS
// ======================================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow Postman/server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked Origin:", origin);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
};

app.use(cors(corsOptions));

// Preflight requests
app.options(/.*/, cors(corsOptions));

// ======================================
// Health Check
// ======================================
app.get("/", (req, res) => {
  res.status(200).send("Velora AI Backend Running 🚀");
});

// ======================================
// Routes
// ======================================
app.use("/api/auth", authRoute);
app.use("/api/website", websiteRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/credits", creditRoute);

// ======================================
// Error Handler
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