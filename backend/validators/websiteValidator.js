import { z } from "zod";

/**
 * Schema for validating website generation requests.
 * Allows passthrough of other fields.
 */
export const GenerateSchema = z.object({
  prompt: z.string().min(10).max(2000),
}).passthrough();

/**
 * Schema for validating website update requests.
 * Allows passthrough of other fields.
 */
export const UpdateSchema = z.object({
  prompt: z.string().min(5).max(2000),
  websiteId: z.string().regex(/^[a-f\d]{24}$/i, {
    message: "Invalid website ID format",
  }),
}).passthrough();

/**
 * Schema for validating website deployment requests.
 * Allows passthrough of other fields.
 */
export const DeploySchema = z.object({
  websiteId: z.string().regex(/^[a-f\d]{24}$/i, {
    message: "Invalid website ID format",
  }),
}).passthrough();

/**
 * Schema for validating project ID in file paths.
 */
export const ProjectIdSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
}).passthrough();

/**
 * Schema for validating file/project IDs in sub-resource paths.
 */
export const FileIdSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  fileId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid file ID format" }),
}).passthrough();

/**
 * Schema for creating a new file.
 */
export const CreateFileSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  path: z.string().min(1).max(255).refine(
    p => !p.includes('..') && !p.startsWith('/') && !p.startsWith('\\'),
    { message: "Invalid path format or path traversal attempt" }
  ),
  content: z.string().optional(),
  language: z.string().optional(),
}).passthrough();

/**
 * Schema for updating file content.
 */
export const UpdateFileSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  fileId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid file ID format" }),
  content: z.string(),
}).passthrough();

/**
 * Schema for renaming a file.
 */
export const RenameFileSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  fileId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid file ID format" }),
  newPath: z.string().min(1).max(255).refine(
    p => !p.includes('..') && !p.startsWith('/') && !p.startsWith('\\'),
    { message: "Invalid path format or path traversal attempt" }
  ),
}).passthrough();

/**
 * Schema for creating a folder.
 */
export const CreateFolderSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  path: z.string().min(1).max(255).refine(
    p => !p.includes('..') && !p.startsWith('/') && !p.startsWith('\\'),
    { message: "Invalid path format or path traversal attempt" }
  ),
}).passthrough();

/**
 * Schema for initiating AI targeted chat edits.
 */
export const ChatSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  instruction: z.string().min(5).max(1000),
}).passthrough();

/**
 * Schema for retrieving project chat history.
 */
export const ChatHistorySchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  before: z.string().optional(),
}).passthrough();

/**
 * Schema for exporting a project.
 */
export const ExportSchema = z.object({
  websiteId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid website ID format" }),
}).passthrough();

/**
 * Schema for accepting AI targeted chat edits.
 */
export const AcceptChatSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, { message: "Invalid project ID format" }),
  instruction: z.string().min(5).max(1000),
  message: z.string(),
  tokensUsed: z.number().optional(),
  files: z.array(
    z.object({
      path: z.string().min(1).max(255).refine(
        p => !p.includes('..') && !p.startsWith('/') && !p.startsWith('\\'),
        { message: "Invalid path format or path traversal attempt" }
      ),
      content: z.string(),
    })
  ),
}).passthrough();

/**
 * Schema for exporting a project to GitHub.
 */
export const GithubExportSchema = z.object({
  githubToken: z.string().min(1, "GitHub Personal Access Token is required"),
  repoName: z.string().min(1, "Repository name is required").regex(/^[a-zA-Z0-9-_]+$/, {
    message: "Repository name can only contain letters, numbers, hyphens, and underscores",
  }),
  isPrivate: z.boolean().default(false),
}).passthrough();
