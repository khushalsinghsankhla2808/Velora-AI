import { User } from "../models/userMODEL.js";
import jwt from "jsonwebtoken";

export const googleAuth = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;

    // =======================
    // Validate input
    // =======================
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // =======================
    // Find or create user
    // =======================
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ name, email, avatar });
    }

    // =======================
    // FIX: use correct env key
    // (change JWT_SECRET if your .env uses different name)
    // =======================
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
      secure: false, // true in production (HTTPS)
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GoogleAuth Error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
