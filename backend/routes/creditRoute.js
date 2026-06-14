import express from "express";
import { getCreditHistory } from "../controllers/creditController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

router.get("/history", isAuthenticated, getCreditHistory);

export default router;
