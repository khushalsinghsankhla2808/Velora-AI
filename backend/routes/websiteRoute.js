// PATH: backend/routes/websiteRoute.js
import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { generateLimiter, updateLimiter } from "../middlewares/security.js";
import { validate } from "../middlewares/validate.js";
import {
  GenerateSchema,
  UpdateSchema,
  DeploySchema,
} from "../validators/websiteValidator.js";
import {
  generateWebsite,
  getAllWebsite,
  getWebsiteById,
  changeWebsite,
  deployWebsite,
  getBySlug,
} from "../controllers/websiteController.js";

const router = express.Router();

router.post("/generate", isAuthenticated, generateLimiter, validate(GenerateSchema), generateWebsite);
router.get("/getall", isAuthenticated, getAllWebsite);
router.get("/getbyid/:id", isAuthenticated, getWebsiteById);
router.post("/update/:id", isAuthenticated, updateLimiter, validate(UpdateSchema), changeWebsite);
router.get("/deploy/:id", isAuthenticated, validate(DeploySchema), deployWebsite);
router.get("/site/:slug", getBySlug);

export default router;
