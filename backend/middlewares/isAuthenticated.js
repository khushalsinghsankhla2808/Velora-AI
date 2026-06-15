// PATH: backend/middlewares/isAuthenticated.js
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { sendError } from "../utils/apiResponse.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendError(res, "TOKEN_NOT_FOUND", "Token not found", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return sendError(res, "USER_NOT_FOUND", "User not found", 401);
    }

    next();
  } catch (error) {
    return sendError(res, "INVALID_TOKEN", "Invalid Token", 401);
  }
};
