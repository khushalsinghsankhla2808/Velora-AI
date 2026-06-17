// PATH: backend/routes/websiteRoute.js
import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { generateLimiter, updateLimiter } from "../middlewares/security.js";
import { validate } from "../middlewares/validate.js";
import {
  GenerateSchema,
  UpdateSchema,
  DeploySchema,
  ProjectIdSchema,
  FileIdSchema,
  CreateFileSchema,
  UpdateFileSchema,
  RenameFileSchema,
  CreateFolderSchema,
  ChatSchema,
  ChatHistorySchema,
} from "../validators/websiteValidator.js";
import {
  generateWebsite,
  getAllWebsite,
  getWebsiteById,
  changeWebsite,
  deployWebsite,
  getBySlug,
  listProjectFiles,
  getSingleFile,
  createProjectFile,
  updateProjectFile,
  renameProjectFile,
  deleteProjectFile,
  createProjectFolder,
  targetedChatEdit,
  getChatHistory,
} from "../controllers/websiteController.js";

const router = express.Router();

router.post("/generate", isAuthenticated, generateLimiter, validate(GenerateSchema), generateWebsite);
router.get("/getall", isAuthenticated, getAllWebsite);
router.get("/getbyid/:id", isAuthenticated, getWebsiteById);
router.post("/update/:id", isAuthenticated, updateLimiter, validate(UpdateSchema), changeWebsite);
router.get("/deploy/:id", isAuthenticated, validate(DeploySchema), deployWebsite);
router.get("/site/:slug", getBySlug);

// File and folder CRUD operations (sub-resources of project/website)
router.get("/:projectId/files", isAuthenticated, validate(ProjectIdSchema), listProjectFiles);
router.get("/:projectId/files/:fileId", isAuthenticated, validate(FileIdSchema), getSingleFile);
router.post("/:projectId/files", isAuthenticated, updateLimiter, validate(CreateFileSchema), createProjectFile);
router.put("/:projectId/files/:fileId", isAuthenticated, updateLimiter, validate(UpdateFileSchema), updateProjectFile);
router.patch("/:projectId/files/:fileId/rename", isAuthenticated, updateLimiter, validate(RenameFileSchema), renameProjectFile);
router.delete("/:projectId/files/:fileId", isAuthenticated, updateLimiter, validate(FileIdSchema), deleteProjectFile);
router.post("/:projectId/folders", isAuthenticated, updateLimiter, validate(CreateFolderSchema), createProjectFolder);

// AI Chat targeted editing
router.post("/:projectId/chat", isAuthenticated, updateLimiter, validate(ChatSchema), targetedChatEdit);
router.get("/:projectId/chat", isAuthenticated, validate(ChatHistorySchema), getChatHistory);

export default router;
