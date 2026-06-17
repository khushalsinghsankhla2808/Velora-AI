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
  ExportSchema,
  AcceptChatSchema,
  GithubExportSchema,
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
  exportWebsite,
  acceptChatEdit,
  undoChatEdit,
  exportToGithub,
  analyzeStack,
  saveVersion,
  listVersions,
  restoreVersion,
  forkWebsite,
  debugWebsite,
  saveComponentToMarketplace,
  listMarketplaceComponents,
  importMarketplaceComponent,
  addCollaborator,
  listCollaborators,
  removeCollaborator,
  auditWebsite,
  generateBrand,
} from "../controllers/websiteController.js";

const router = express.Router();

router.post("/generate", isAuthenticated, generateLimiter, validate(GenerateSchema), generateWebsite);
router.post("/analyze-stack", isAuthenticated, validate(GenerateSchema), analyzeStack);
router.get("/getall", isAuthenticated, getAllWebsite);
router.get("/getbyid/:id", isAuthenticated, getWebsiteById);
router.post("/update/:id", isAuthenticated, updateLimiter, validate(UpdateSchema), changeWebsite);
router.get("/deploy/:id", isAuthenticated, validate(DeploySchema), deployWebsite);
router.get("/:id/export", isAuthenticated, updateLimiter, validate(ExportSchema), exportWebsite);
router.post("/:id/export/github", isAuthenticated, updateLimiter, validate(GithubExportSchema), exportToGithub);
router.get("/site/:slug", getBySlug);

// File and folder CRUD operations (sub-resources of project/website)
router.get("/:projectId/files", isAuthenticated, updateLimiter, validate(ProjectIdSchema), listProjectFiles);
router.get("/:projectId/files/:fileId", isAuthenticated, updateLimiter, validate(FileIdSchema), getSingleFile);
router.post("/:projectId/files", isAuthenticated, updateLimiter, validate(CreateFileSchema), createProjectFile);
router.put("/:projectId/files/:fileId", isAuthenticated, updateLimiter, validate(UpdateFileSchema), updateProjectFile);
router.patch("/:projectId/files/:fileId/rename", isAuthenticated, updateLimiter, validate(RenameFileSchema), renameProjectFile);
router.delete("/:projectId/files/:fileId", isAuthenticated, updateLimiter, validate(FileIdSchema), deleteProjectFile);
router.post("/:projectId/folders", isAuthenticated, updateLimiter, validate(CreateFolderSchema), createProjectFolder);

// AI Chat targeted editing
router.post("/:projectId/chat", isAuthenticated, updateLimiter, validate(ChatSchema), targetedChatEdit);
router.get("/:projectId/chat", isAuthenticated, updateLimiter, validate(ChatHistorySchema), getChatHistory);
router.post("/:projectId/chat/accept", isAuthenticated, updateLimiter, validate(AcceptChatSchema), acceptChatEdit);
router.post("/:projectId/chat/undo", isAuthenticated, updateLimiter, validate(ProjectIdSchema), undoChatEdit);

// Version history
router.post("/:projectId/versions", isAuthenticated, updateLimiter, saveVersion);
router.get("/:projectId/versions", isAuthenticated, updateLimiter, listVersions);
router.post("/:projectId/versions/:versionId/restore", isAuthenticated, updateLimiter, restoreVersion);

// Forking
router.post("/:projectId/fork", isAuthenticated, updateLimiter, forkWebsite);

// Debugger
router.post("/:projectId/debug", isAuthenticated, updateLimiter, debugWebsite);

// Marketplace
router.post("/marketplace", isAuthenticated, saveComponentToMarketplace);
router.get("/marketplace", isAuthenticated, listMarketplaceComponents);
router.post("/:projectId/marketplace/:componentId/import", isAuthenticated, updateLimiter, importMarketplaceComponent);

// Collaboration
router.post("/:projectId/collaborators", isAuthenticated, updateLimiter, addCollaborator);
router.get("/:projectId/collaborators", isAuthenticated, updateLimiter, listCollaborators);
router.delete("/:projectId/collaborators/:userId", isAuthenticated, updateLimiter, removeCollaborator);

// Audit
router.post("/:projectId/audit", isAuthenticated, updateLimiter, auditWebsite);

// Brand Generator
router.post("/:projectId/brand", isAuthenticated, updateLimiter, generateBrand);

export default router;
