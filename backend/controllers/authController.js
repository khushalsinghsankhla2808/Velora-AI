// PATH: backend/controllers/authController.js
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { User } from "../models/userMODEL.js";
import jwt from "jsonwebtoken";
import {
  getFirebaseAuth,
  hasFirebaseAdminCredentials,
} from "../config/firebaseAdmin.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

const decodeJwtPayload = (token) => {
  const payload = token.split(".")[1];

  if (!payload) {
    throw new Error("Invalid Firebase ID token");
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
};

const verifyFirebaseToken = async (idToken) => {
  if (hasFirebaseAdminCredentials()) {
    return getFirebaseAuth().verifyIdToken(idToken);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Firebase Admin credentials missing");
  }

  console.warn(
    "Firebase Admin credentials missing. Using development-only decoded token fallback.",
  );
  return decodeJwtPayload(idToken);
};

export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    // =======================
    // Validate input
    // =======================
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: "FIREBASE_TOKEN_REQUIRED",
          message: "Firebase ID token is required",
        },
      });
    }

    const decodedToken = await verifyFirebaseToken(idToken);
    const email = decodedToken.email;
    const name = decodedToken.name || email?.split("@")[0];
    const avatar = decodedToken.picture;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: "GOOGLE_PROFILE_INCOMPLETE",
          message: "Verified Google account must include name and email",
        },
      });
    }

    // =======================
    // Find or create user
    // =======================
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ name, email, avatar });
      await CreditTransaction.create({
        user: user._id,
        type: "credit",
        amount: user.credits,
        balanceAfter: user.credits,
        reason: "initial_bonus",
        description: "Welcome bonus credits",
      });
    } else {
      user.name = name;
      user.avatar = avatar;
      await user.save();
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET missing in .env file");
    }

    // =======================
    // Create token
    // =======================
    const token = jwt.sign({ id: user._id }, secret, {
      expiresIn: "7d",
    });

    // =======================
    // Cookie
    // =======================
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, { user });
  } catch (error) {
    console.error("GoogleAuth Error:", error.message);

    const isFirebaseConfigError = error.message.includes(
      "Firebase Admin credentials missing",
    );

    return sendError(
      res,
      isFirebaseConfigError ? "FIREBASE_ADMIN_MISSING" : "GOOGLE_AUTH_FAILED",
      isFirebaseConfigError
        ? "Firebase Admin credentials are missing on the backend"
        : "Google authentication failed",
      isFirebaseConfigError ? 500 : 401,
    );
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return sendSuccess(res, { message: "User logged out successfully" });
  } catch (error) {
    return sendError(res, "LOGOUT_FAILED", error.message, 500);
  }
};
