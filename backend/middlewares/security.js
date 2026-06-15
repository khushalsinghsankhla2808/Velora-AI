// PATH: backend/middlewares/security.js

import { getAllowedOrigins } from "../config/env.js";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 120;
const buckets = new Map();

export const securityHeaders = (req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  next();
};

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (getAllowedOrigins().includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
};

export const rateLimiter = (req, res, next) => {
  const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (bucket.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
      },
    });
  }

  bucket.count += 1;
  return next();
};
