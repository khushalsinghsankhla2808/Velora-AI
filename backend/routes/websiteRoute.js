// PATH: backend/routes/websiteRoute.js
import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { generateLimiter } from "../middlewares/security.js";
import {
  generateWebsite,
  getAllWebsite,
  getWebsiteById,
  changeWebsite,
  deployWebsite,
  getBySlug,
} from "../controllers/websiteController.js";

const router = express.Router();

router.post("/generate", isAuthenticated, generateLimiter, generateWebsite);
router.get("/getall", isAuthenticated, getAllWebsite);
router.get("/getbyid/:id", isAuthenticated, getWebsiteById);
router.post("/update/:id", isAuthenticated, changeWebsite);
router.get("/deploy/:id", isAuthenticated, deployWebsite);
router.get("/site/:slug", getBySlug);

export default router;
