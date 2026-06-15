import { getAllowedOrigins } from "../config/env.js";
import rateLimit from "express-rate-limit";

/**
 * Middleware to inject standard security headers to outgoing responses.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
export const securityHeaders = (req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=()"
  );
  next();
};

/**
 * CORS configurations specifying allowed origins, credentials, headers, and methods.
 */
export const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) return callback(null, true);
    console.error(`CORS Mismatch: "${origin}" not in`, allowed);
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

/**
 * Custom key generator for rate limiting to determine the requester's IP address.
 * Utilizes req.ip with fallback detection for multiple forwarded proxies.
 * @param {import('express').Request} req - The Express request object.
 * @returns {string} The IP address of the client.
 */
export const rateLimitKeyGenerator = (req) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || "unknown";
};

/**
 * Default error payload sent when a client exceeds a rate limit threshold.
 */
const rateLimitMessage = {
  success: false,
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later.",
  },
};

/**
 * Global rate limiter applied globally to protect all backend routes.
 * Limit: 100 requests per 15 minutes.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: rateLimitKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  validate: false,
});

/**
 * Strict rate limiter applied specifically to website generation.
 * Limit: 10 requests per minute.
 */
export const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: rateLimitKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  validate: false,
});

/**
 * Strict rate limiter applied specifically to website updates.
 * Limit: 20 requests per minute.
 */
export const updateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: rateLimitKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  validate: false,
});

/**
 * Moderate rate limiter applied to payment creation and verification endpoints.
 * Limit: 30 requests per 15 minutes.
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  keyGenerator: rateLimitKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  validate: false,
});