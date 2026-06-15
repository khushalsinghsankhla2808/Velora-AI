// PATH: backend/config/env.js

const requiredBaseEnv = ["MONGO_URI", "JWT_SECRET", "OPENROUTER_API_KEY"];
const requiredProductionEnv = [
  "CLIENT_URL",
  "FRONTEND_URL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_SECRET",
];

export const validateEnv = () => {
  const requiredKeys =
    process.env.NODE_ENV === "production"
      ? [...requiredBaseEnv, ...requiredProductionEnv]
      : requiredBaseEnv;

  const missing = requiredKeys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

export const getAllowedOrigins = () => {
  const origins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]
    .filter(Boolean)
    .map((url) => url.trim().replace(/\/$/, ""));

  return [...new Set(origins)];
};
