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
