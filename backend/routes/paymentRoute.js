// PATH: backend/routes/paymentRoute.js
import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { paymentLimiter } from "../middlewares/security.js";
import { validate } from "../middlewares/validate.js";
import { CreateOrderSchema, VerifySchema } from "../validators/paymentValidator.js";
import {
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/order", isAuthenticated, paymentLimiter, validate(CreateOrderSchema), createOrder);
router.post("/create-order", isAuthenticated, paymentLimiter, validate(CreateOrderSchema), createOrder);
router.post("/verify", isAuthenticated, paymentLimiter, validate(VerifySchema), verifyPayment);

export default router;
