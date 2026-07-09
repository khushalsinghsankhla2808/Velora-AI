// PATH: backend/controllers/websiteController.js

import { callOpenRouter } from "../services/ai/geminiClient.js";
import extractJson from "../utils/extractJson.js";
import { Website } from "../models/websiteModel.js";
import { User } from "../models/userModel.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { isValidObjectId, parsePagination, validateText } from "../utils/validation.js";
import { ensureWebsiteFiles, bundleHTML, saveWebsiteFiles, getLanguageFromPath } from "../utils/migrationHelper.js";
import { FileModel } from "../models/fileModel.js";
import { Chat } from "../models/chatModel.js";
import { Version } from "../models/versionModel.js";
import { MarketplaceComponent } from "../models/marketplaceComponentModel.js";
import { ZipArchive } from "archiver";
import { Octokit } from "@octokit/rest";


const GENERATE_COST = 10;
const UPDATE_COST = 5;

// ✅ Updated to allow only Gemini 2.5 Flash
const ALLOWED_MODELS = new Set([
    "google/gemini-2.5-flash",
]);

// ✅ Language-specific instructions injected into the master prompt
const CODE_PREFERENCE_INSTRUCTIONS = {
    "keep": "",
    "html-css-js": "Use clean semantic HTML5, vanilla CSS3 with CSS variables, and vanilla JavaScript ES6+. No frameworks.",
    "javascript": "Write JavaScript-heavy code. Use modern ES6+ features, async/await, DOM manipulation, fetch API. Minimal CSS frameworks.",
    "typescript": "Write TypeScript-style code with strict typing comments in JSDoc format. Use modern ES6+ patterns.",
    "react": "Structure the code like React components using vanilla JS. Use component-like functions, state management patterns, and props-like patterns in plain JS.",
    "tailwind": "Use Tailwind CSS via CDN (https://cdn.tailwindcss.com). Apply Tailwind utility classes throughout. Do not write custom CSS except for animations.",
    "vue": "Structure JavaScript like Vue 3 Composition API patterns using vanilla JS. Use reactive data patterns and template-like rendering functions.",
    "bootstrap": "Use Bootstrap 5 via CDN (https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css and JS). Use Bootstrap grid, components, and utilities throughout.",
    "glassmorphism": "Apply glassmorphism UI design: frosted glass effect (backdrop-filter: blur), semi-transparent backgrounds (rgba with 0.1-0.2 opacity), subtle borders (1px solid rgba(255,255,255,0.2)), dark or gradient backgrounds. Make it look premium and modern.",
    "neumorphism": "Apply neumorphism UI design: soft UI with subtle inset/outset shadows on matching background colors. Use light gray (#e0e5ec) or dark (#2d3436) base. Shadows: positive and negative box-shadow pairs.",
    "material": "Apply Material Design 3 principles: use Material color system, elevation shadows, ripple effects on buttons, Material typography scale (Roboto font via Google Fonts is allowed), cards with proper elevation.",
    "scss": "Write CSS as if it were SCSS (nested selectors as comments, BEM methodology, CSS custom properties as variables). Focus on well-organized, modular CSS architecture with smooth animations.",
    "animations": "Focus heavily on animations and micro-interactions: CSS keyframe animations, scroll-triggered effects using Intersection Observer, hover transitions (300ms ease), page transitions, loading skeletons, and parallax effects.",
};

const validateModel = (model) => {
    // Automatically resolve all requests to Gemini 2.5 Flash
    return "google/gemini-2.5-flash";
};

export const generateWebsite = async (req, res) => {
    let creditsReserved = false;
    try {
        const { prompt, model: rawModel } = req.body;

        const model = validateModel(rawModel);
        if (!model) {
            return sendError(res, "INVALID_MODEL", "Selected AI model is not supported", 400);
        }

        const codePreference = ALLOWED_CODE_PREFERENCES.has(req.body.codePreference)
            ? req.body.codePreference
            : "html-css-js";

        // ✅ Get language-specific instructions
        const langInstructions = CODE_PREFERENCE_INSTRUCTIONS[codePreference] || "";

        const user = await User.findOneAndUpdate(
            { _id: req.user._id, credits: { $gte: GENERATE_COST } },
            { $inc: { credits: -GENERATE_COST } },
            { new: true }
        );

        if (!user) {
            return sendError(res, "INSUFFICIENT_CREDITS", "Not enough credits. Minimum 10 credits required.", 400);
        }
        creditsReserved = true;

        const masterPrompt = `
You are a **Principal Frontend Architect** at a top-tier agency (ex-Apple + Vercel). 
Generate a **production-grade, visually stunning, fully responsive website** that looks like it was hand-crafted by a senior designer + developer team in 2026.

USER REQUIREMENT: ${prompt}

CODE STYLE: ${langInstructions || "Modern vanilla HTML5 + Tailwind via CDN + clean JS"}

CRITICAL REQUIREMENTS:
1. **Design Excellence**: Premium aesthetics, generous whitespace, micro-animations, perfect typography (system + 1-2 Google fonts), subtle shadows/gradients, hover states.
2. **Structure**: Multi-section SPA with smooth JS navigation. At minimum: Hero, Features/Services, About, Testimonials, Contact (with form).
3. **Responsiveness**: Mobile-first, flawless on all devices. Use Tailwind or clean CSS Grid/Flex.
4. **Performance & Accessibility**: Semantic HTML, proper ARIA, fast load, lazy images, good contrast.
5. **Content**: Rich, professional, benefit-focused copy tailored to the business. NO lorem ipsum. Use real Unsplash/Pexels-style image URLs.
6. **Interactivity**: Working form (JS validation + fake submission), smooth scroll, mobile menu, at least 2-3 subtle animations (GSAP-like via CSS/JS).
7. **Technical**: 
   - index.html loads external CSS/JS via relative paths.
   - All assets HTTPS.
   - No broken links or console errors.
   - Dark/light mode toggle if it fits the brand.

OUTPUT FORMAT — **RAW JSON ONLY**:
{
  "message": "Brief professional summary of the generated site",
  "files": [
    {"path": "index.html", "content": "..."},
    {"path": "style.css", "content": "..."},
    {"path": "script.js", "content": "..."}
    // Support additional files: about.html, components/, assets/ descriptions etc.
  ],
  "metadata": {
    "primaryColor": "#3b82f6",
    "fontFamily": "Inter, system-ui",
    "suggestedSlug": "business-name"
  }
}
`;

        let parsed = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const currentPrompt = attempt === 0 ? masterPrompt : masterPrompt + "\n\nCRITICAL: RETURN ONLY RAW JSON. NO MARKDOWN. NO BACKTICKS.";
            const result = await callOpenRouter({
                prompt: currentPrompt,
                model: process.env.AI_PRIMARY_MODEL || "google/gemini-2.5-flash",
                providerName: "Gemini",
                systemPrompt: "You must return only valid raw JSON. No markdown. No explanation. No code blocks. The JSON must contain a files array.",
            });
            console.log(`Tokens used: ${result.tokensUsed}`);
            if (result.success) {
                parsed = extractJson(result.content);
                if (parsed && parsed.files) break;
            }
        }

        if (!parsed || !parsed.files) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: GENERATE_COST } });
            creditsReserved = false;
            return sendError(res, "INVALID_AI_RESPONSE", "AI returned an invalid response. Please try again.", 400);
        }

        const website = new Website({
            user: user._id,
            title: prompt.slice(0, 60),
            conversation: [
                { role: "user", content: prompt },
                { role: "ai", content: parsed.message },
            ],
        });

        const fileIds = await saveWebsiteFiles(website._id, parsed.files);
        website.files = fileIds;
        website.latestCode = bundleHTML(parsed.files);
        await website.save();

        await CreditTransaction.create({
            user: user._id,
            type: "debit",
            amount: GENERATE_COST,
            balanceAfter: user.credits,
            reason: "website_generation",
            description: "Website generation",
            referenceId: website._id.toString(),
        });
        creditsReserved = false;

        return sendSuccess(res, { websiteId: website._id, remainingCredits: user.credits }, 201);

    } catch (error) {
        if (creditsReserved) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: GENERATE_COST } });
        }
        console.error("generateWebsite error:", error.message);
        if (error.code === "AI_UNAVAILABLE") {
            return sendError(res, "AI_UNAVAILABLE", error.message, 503);
        }
        return sendError(res, "GENERATION_FAILED", "Server error during generation", 500);
    }
};

// ─── Get Website By ID ───────────────────────────────────────────────────────
export const getWebsiteById = async (req, res) => {
    try {
        const id = req.params.id;
        const website = await Website.findOne({
            _id: id,
            $or: [
                { user: req.user._id },
                { "members.user": req.user._id }
            ]
        }).populate("files").lean();
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
        ensureWebsiteFiles(website);
        return sendSuccess(res, { website });
    } catch (error) {
        console.error("getWebsiteById error:", error.message);
        return sendError(res, "WEBSITE_FETCH_FAILED", "Server error", 500);
    }
};

// ─── Update / Change Website ─────────────────────────────────────────────────
export const changeWebsite = async (req, res) => {
    let creditsReserved = false;
    try {
        const id = req.params.id;
        const { prompt, model: rawModel, codePreference: rawCodePref } = req.body;

        const model = validateModel(rawModel);
        if (!model) return sendError(res, "INVALID_MODEL", "Selected AI model is not supported", 400);

        const codePreference = ALLOWED_CODE_PREFERENCES.has(rawCodePref)
            ? rawCodePref
            : "keep";

        const langInstructions = CODE_PREFERENCE_INSTRUCTIONS[codePreference] || "";

        const website = await Website.findOne({
            _id: id,
            $or: [
                { user: req.user._id },
                { "members.user": req.user._id }
            ]
        }).populate("files");
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);

        const role = getProjectRole(website, req.user._id);
        if (!role || role === "viewer") {
            return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
        }

        const user = await User.findOneAndUpdate(
            { _id: req.user._id, credits: { $gte: UPDATE_COST } },
            { $inc: { credits: -UPDATE_COST } },
            { new: true }
        );

        if (!user) return sendError(res, "INSUFFICIENT_CREDITS", "Not enough credits. Minimum 5 credits required.", 400);
        creditsReserved = true;

        let filesData = [];
        if (website.files && website.files.length > 0) {
            filesData = website.files.map(f => ({ path: f.path, content: f.content }));
        } else {
            filesData = [{ path: "index.html", content: website.latestCode || "" }];
        }

        const updatePrompt = `
UPDATE THIS EXISTING WEBSITE BASED ON THE USER REQUEST BELOW.

CURRENT CODEBASE FILES:
${JSON.stringify(filesData, null, 2)}

USER REQUEST:
${prompt}

CODE STYLE: ${langInstructions || "Keep existing code style"}

STRICT RULES:
- Return the COMPLETE updated list of files (not just changed parts)
- Keep all existing sections unless explicitly asked to remove
- Maintain responsive structure and navigation
- Use only HTTPS URLs for ALL resources/images
- Apply the requested changes precisely

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{
  "message": "Short confirmation of what was changed",
  "files": [
    { "path": "index.html", "content": "<UPDATED CONTENT>" },
    { "path": "style.css", "content": "<UPDATED CONTENT>" },
    { "path": "script.js", "content": "<UPDATED CONTENT>" }
  ]
}
`;

        let parsed = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const currentPrompt = attempt === 0 ? updatePrompt : updatePrompt + "\n\nRETURN ONLY RAW JSON. The JSON must contain a files array.";
            const result = await callOpenRouter({
                prompt: currentPrompt,
                model: process.env.AI_PRIMARY_MODEL || "google/gemini-2.5-flash",
                providerName: "Gemini",
                systemPrompt: "You must return only valid raw JSON. No markdown. No explanation. No code blocks. The JSON must contain a files array.",
            });
            console.log(`Tokens used: ${result.tokensUsed}`);
            if (result.success) {
                parsed = extractJson(result.content);
                if (parsed && parsed.files) break;
            }
        }

        if (!parsed || !parsed.files) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: UPDATE_COST } });
            creditsReserved = false;
            return sendError(res, "INVALID_AI_RESPONSE", "AI returned an invalid response. Please try again.", 400);
        }

        const fileIds = await saveWebsiteFiles(website._id, parsed.files);
        website.files = fileIds;
        website.latestCode = bundleHTML(parsed.files);

        website.conversation.push(
            { role: "user", content: prompt },
            { role: "ai", content: parsed.message }
        );
        await website.save();

        await CreditTransaction.create({
            user: user._id,
            type: "debit",
            amount: UPDATE_COST,
            balanceAfter: user.credits,
            reason: "website_update",
            description: "Website update",
            referenceId: website._id.toString(),
        });
        creditsReserved = false;

        return sendSuccess(res, { message: parsed.message, code: website.latestCode, remainingCredits: user.credits });

    } catch (error) {
        if (creditsReserved) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: UPDATE_COST } });
        }
        console.error("changeWebsite error:", error.message);
        if (error.code === "AI_UNAVAILABLE") {
            return sendError(res, "AI_UNAVAILABLE", error.message, 503);
        }
        return sendError(res, "UPDATE_FAILED", "Server error during update", 500);
    }
};

// ─── Get All Websites ────────────────────────────────────────────────────────
export const getAllWebsite = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query, { limit: 12, maxLimit: 30 });
        const filter = {
            $or: [
                { user: req.user._id },
                { "members.user": req.user._id }
            ]
        };
        const [websites, total] = await Promise.all([
            Website.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
            Website.countDocuments(filter),
        ]);
        return sendSuccess(res, {
            websites,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total },
        });
    } catch (error) {
        console.error("getAllWebsite error:", error.message);
        return sendError(res, "WEBSITES_FETCH_FAILED", "Server error", 500);
    }
};

// ─── Deploy Website ───────────────────────────────────────────────────────────
export const deployWebsite = async (req, res) => {
    try {
        const id = req.params.id;
        const website = await Website.findOne({
            _id: id,
            $or: [
                { user: req.user._id },
                { "members.user": req.user._id }
            ]
        });
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);

        const role = getProjectRole(website, req.user._id);
        if (!role || role === "viewer") {
            return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
        }

        if (!website.slug) {
            website.slug = website.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60) + website._id.toString().slice(-5);
        }
        website.deployed = true;
        website.deployUrl = `${process.env.FRONTEND_URL}/site/${website.slug}`;
        await website.save();

        return sendSuccess(res, { url: website.deployUrl });
    } catch (error) {
        console.error("deployWebsite error:", error.message);
        return sendError(res, "DEPLOY_FAILED", "Server error during deployment", 500);
    }
};

// ─── Get By Slug (Public) ────────────────────────────────────────────────────
export const getBySlug = async (req, res) => {
    try {
        const slugValidation = validateText({ value: req.params.slug, field: "Slug", min: 3, max: 100 });
        if (!slugValidation.valid || !/^[a-z0-9-]+$/.test(slugValidation.value)) {
            return sendError(res, "INVALID_SLUG", "Invalid site slug", 400);
        }
        const website = await Website.findOne({ slug: slugValidation.value, deployed: true }).populate("files").lean();
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
        ensureWebsiteFiles(website);
        return sendSuccess(res, { website });
    } catch (error) {
        console.error("getBySlug error:", error.message);
        return sendError(res, "WEBSITE_FETCH_FAILED", "Server error", 500);
    }
};

// Helper to migrate legacy project to multi-file DB representation
const migrateLegacyProjectToDB = async (website) => {
  if (!website.files || website.files.length === 0) {
    const legacyFile = await FileModel.create({
      projectId: website._id,
      path: "index.html",
      content: website.latestCode || "",
      language: "html"
    });
    website.files = [legacyFile._id];
    await website.save();
  }
};

export const listProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role) {
      return sendError(res, "ACCESS_DENIED", "You do not have access to this project", 403);
    }

    const files = await FileModel.find({ projectId }).lean();
    if (files.length === 0) {
      // Simulate files array
      return sendSuccess(res, {
        files: [{
          _id: "legacy",
          projectId,
          path: "index.html",
          content: website.latestCode || "",
          language: "html",
          createdAt: website.createdAt,
          updatedAt: website.updatedAt,
        }]
      });
    }

    return sendSuccess(res, { files });
  } catch (error) {
    console.error("listProjectFiles error:", error.message);
    return sendError(res, "FILES_FETCH_FAILED", "Server error listing files", 500);
  }
};

export const getSingleFile = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role) {
      return sendError(res, "ACCESS_DENIED", "You do not have access to this project", 403);
    }

    if (fileId === "legacy") {
      return sendSuccess(res, {
        file: {
          _id: "legacy",
          projectId,
          path: "index.html",
          content: website.latestCode || "",
          language: "html",
          createdAt: website.createdAt,
          updatedAt: website.updatedAt,
        }
      });
    }

    const file = await FileModel.findOne({ _id: fileId, projectId }).lean();
    if (!file) {
      return sendError(res, "FILE_NOT_FOUND", "File not found", 404);
    }

    return sendSuccess(res, { file });
  } catch (error) {
    console.error("getSingleFile error:", error.message);
    return sendError(res, "FILE_FETCH_FAILED", "Server error retrieving file", 500);
  }
};

export const createProjectFile = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path, content, language } = req.body;
    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    await migrateLegacyProjectToDB(website);

    const existing = await FileModel.findOne({ projectId, path });
    if (existing) {
      return sendError(res, "FILE_ALREADY_EXISTS", "File path already exists in project", 409);
    }

    const fileLang = language || getLanguageFromPath(path);
    const file = await FileModel.create({
      projectId,
      path,
      content: content || "",
      language: fileLang
    });

    website.files.push(file._id);
    const allFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(allFiles);
    await website.save();

    return sendSuccess(res, { file }, 201);
  } catch (error) {
    console.error("createProjectFile error:", error.message);
    return sendError(res, "FILE_CREATE_FAILED", "Server error creating file", 500);
  }
};

export const updateProjectFile = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const { content } = req.body;
    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    await migrateLegacyProjectToDB(website);

    let file;
    if (fileId === "legacy") {
      file = await FileModel.findOne({ projectId, path: "index.html" });
    } else {
      file = await FileModel.findOne({ _id: fileId, projectId });
    }

    if (!file) {
      return sendError(res, "FILE_NOT_FOUND", "File not found", 404);
    }

    file.content = content;
    await file.save();

    const allFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(allFiles);
    await website.save();

    return sendSuccess(res, { file });
  } catch (error) {
    console.error("updateProjectFile error:", error.message);
    return sendError(res, "FILE_UPDATE_FAILED", "Server error updating file", 500);
  }
};

export const renameProjectFile = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const { newPath } = req.body;
    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    await migrateLegacyProjectToDB(website);

    let file;
    if (fileId === "legacy") {
      file = await FileModel.findOne({ projectId, path: "index.html" });
    } else {
      file = await FileModel.findOne({ _id: fileId, projectId });
    }

    if (!file) {
      return sendError(res, "FILE_NOT_FOUND", "File not found", 404);
    }

    // Check if newPath already exists
    const existing = await FileModel.findOne({ projectId, path: newPath });
    if (existing) {
      return sendError(res, "FILE_ALREADY_EXISTS", "New path already exists in project", 409);
    }

    file.path = newPath;
    file.language = getLanguageFromPath(newPath);
    await file.save();

    const allFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(allFiles);
    await website.save();

    return sendSuccess(res, { file });
  } catch (error) {
    console.error("renameProjectFile error:", error.message);
    return sendError(res, "FILE_RENAME_FAILED", "Server error renaming file", 500);
  }
};

export const deleteProjectFile = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    await migrateLegacyProjectToDB(website);

    let file;
    if (fileId === "legacy") {
      file = await FileModel.findOne({ projectId, path: "index.html" });
    } else {
      file = await FileModel.findOne({ _id: fileId, projectId });
    }

    if (!file) {
      return sendError(res, "FILE_NOT_FOUND", "File not found", 404);
    }

    await FileModel.deleteOne({ _id: file._id });

    website.files = website.files.filter(id => id.toString() !== file._id.toString());
    const allFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(allFiles);
    await website.save();

    return sendSuccess(res, { message: "File deleted successfully" });
  } catch (error) {
    console.error("deleteProjectFile error:", error.message);
    return sendError(res, "FILE_DELETE_FAILED", "Server error deleting file", 500);
  }
};

export const createProjectFolder = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path } = req.body;
    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    await migrateLegacyProjectToDB(website);

    const keepFilePath = `${path}/.keep`;
    const existing = await FileModel.findOne({ projectId, path: keepFilePath });
    if (existing) {
      return sendError(res, "FOLDER_ALREADY_EXISTS", "Folder already exists", 409);
    }

    const file = await FileModel.create({
      projectId,
      path: keepFilePath,
      content: "",
      language: "plaintext"
    });

    website.files.push(file._id);
    await website.save();

    return sendSuccess(res, { folder: { path } }, 201);
  } catch (error) {
    console.error("createProjectFolder error:", error.message);
    return sendError(res, "FOLDER_CREATE_FAILED", "Server error creating folder", 500);
  }
};

// ─── AI Chat Targeted Edit ──────────────────────────────────────────────────
export const targetedChatEdit = async (req, res) => {
  let creditsReserved = false;
  const CHAT_COST = 2;

  try {
    const { projectId } = req.params;
    const { instruction } = req.body;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id, credits: { $gte: CHAT_COST } },
      { $inc: { credits: -CHAT_COST } },
      { new: true }
    );

    if (!user) {
      return sendError(res, "INSUFFICIENT_CREDITS", "Not enough credits. Minimum 2 credits required.", 402);
    }
    creditsReserved = true;

    await migrateLegacyProjectToDB(website);

    const currentFiles = await FileModel.find({ projectId });
    const filesData = currentFiles.map((f) => ({ path: f.path, content: f.content }));

    const chatPrompt = `
You are a senior frontend engineer assisting with targeted website modifications.
The user wants to modify an existing website.

Here are the current files in the workspace:
${JSON.stringify(filesData, null, 2)}

User Instruction:
${instruction}

STRICT TECHNICAL RULES:
1. ONLY return files that are newly created or modified to satisfy the user's instruction.
2. DO NOT return unchanged files.
3. DO NOT return empty files, placeholders, or code snippets (e.g. "// rest of the file..."). Deliver the COMPLETE content of the modified/created files.
4. If a file is NOT modified, do not list it in the output at all.
5. All references, links, and styling changes must be functional. Use only HTTPS URLs for external resources.
6. Path formats must not contain path traversal (e.g. "..") or start with "/" or "\\".

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{
  "message": "A summary of what changes were made",
  "files": [
    { "path": "path/to/file.js", "content": "<COMPLETE REPLACING CONTENT>" }
  ]
}

If you do not need to modify any files, return an empty "files" array.
`;

    let parsed = null;
    let result = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const currentPrompt = attempt === 0 ? chatPrompt : chatPrompt + "\n\nCRITICAL: RETURN ONLY RAW JSON. NO MARKDOWN. NO BACKTICKS.";
      result = await callOpenRouter({
        prompt: currentPrompt,
        model: process.env.AI_PRIMARY_MODEL || "google/gemini-2.5-flash",
        providerName: "Gemini",
        systemPrompt: "You must return only valid raw JSON. No markdown. No explanation. No code blocks. The JSON must contain a files array.",
      });
      console.log(`Tokens used: ${result.tokensUsed}`);
      if (result.success) {
        parsed = extractJson(result.content);
        if (parsed && parsed.files) break;
      }
    }

    if (!parsed || !parsed.files) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { credits: CHAT_COST } });
      creditsReserved = false;
      return sendError(res, "INVALID_AI_RESPONSE", "AI returned an invalid response. Please try again.", 400);
    }

    // Path traversal and validation check
    for (const file of parsed.files) {
      if (!file.path || typeof file.path !== "string") {
        await User.findByIdAndUpdate(req.user._id, { $inc: { credits: CHAT_COST } });
        creditsReserved = false;
        return sendError(res, "INVALID_FILE_PATH", "Invalid file path in AI response", 400);
      }
      const cleanPath = file.path.trim();
      if (cleanPath.includes("..") || cleanPath.startsWith("/") || cleanPath.startsWith("\\")) {
        await User.findByIdAndUpdate(req.user._id, { $inc: { credits: CHAT_COST } });
        creditsReserved = false;
        return sendError(res, "PATH_TRAVERSAL_DETECTED", "Path traversal or absolute path detected", 400);
      }
    }

    const filesChanged = [];
    for (const responseFile of parsed.files) {
      const filePath = responseFile.path;
      const fileContent = responseFile.content || "";

      let dbFile = await FileModel.findOne({ projectId, path: filePath });
      const oldContent = dbFile ? dbFile.content : "";
      filesChanged.push({
        path: filePath,
        oldContent,
        newContent: fileContent,
      });
    }

    // Refund reserved credits immediately; they will be charged on Accept.
    await User.findByIdAndUpdate(req.user._id, { $inc: { credits: CHAT_COST } });
    creditsReserved = false;

    return sendSuccess(res, {
      message: parsed.message || "I have proposed updates to your files.",
      filesChanged,
      tokensUsed: (result && result.tokensUsed) || 0,
    });

  } catch (error) {
    if (creditsReserved) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { credits: CHAT_COST } });
    }
    console.error("targetedChatEdit error:", error.message);
    if (error.code === "AI_UNAVAILABLE") {
      return sendError(res, "AI_UNAVAILABLE", error.message, 503);
    }
    return sendError(res, "CHAT_EDIT_FAILED", "Server error during chat edit", 500);
  }
};

// ─── Get Chat History ────────────────────────────────────────────────────────
export const getChatHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const before = req.query.before;

    const website = await Website.findOne({
      _id: projectId,
      $or: [
        { user: req.user._id },
        { "members.user": req.user._id }
      ]
    });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role) {
      return sendError(res, "ACCESS_DENIED", "You do not have access to this project", 403);
    }

    const filter = { projectId };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const limit = 50;
    const messages = await Chat.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return sendSuccess(res, {
      messages,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error("getChatHistory error:", error.message);
    return sendError(res, "CHAT_HISTORY_FAILED", "Server error retrieving chat history", 500);
  }
};

// ─── Export Project as ZIP ──────────────────────────────────────────────────
export const exportWebsite = async (req, res) => {
  try {
    const websiteId = req.params.id;
    const exportType = req.query.exportType || "html";

    const website = await Website.findById(websiteId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role) {
      return sendError(res, "ACCESS_DENIED", "You do not have access to this project", 403);
    }

    // Ensure legacy project has files in DB
    await migrateLegacyProjectToDB(website);

    // Get all files
    const files = await FileModel.find({ projectId: websiteId }).lean();
    if (!files || files.length === 0) {
      return sendError(res, "NO_FILES_FOUND", "No files found to export", 404);
    }

    // Transpile/Scaffold if needed
    const exportFiles = getExportFiles(files, exportType, website.title);

    // Standardize file name
    const sanitizedTitle = website.title
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50) || "website";

    res.setHeader("Content-Type", "application/zip");
    const filenameSuffix = exportType === "html" ? "_export.zip" : `_${exportType}_export.zip`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedTitle}${filenameSuffix}"`
    );

    const archive = new ZipArchive({
      zlib: { level: 9 }, // Maximum compression level
    });

    archive.on("error", (err) => {
      console.error("ZIP archiver error:", err.message);
      if (!res.headersSent) {
        return sendError(res, "EXPORT_ARCHIVE_FAILED", "Failed to create archive", 500);
      }
    });

    archive.pipe(res);

    for (const file of exportFiles) {
      archive.append(file.content || "", { name: file.path });
    }

    await archive.finalize();
  } catch (error) {
    console.error("exportWebsite error:", error.message);
    if (!res.headersSent) {
      return sendError(res, "EXPORT_FAILED", "Server error exporting project", 500);
    }
  }
};

// ─── Export Project to GitHub ────────────────────────────────────────────────
export const exportToGithub = async (req, res) => {
  try {
    const websiteId = req.params.id;
    const { githubToken, repoName, isPrivate, exportType = "html" } = req.body;

    const website = await Website.findById(websiteId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    // Ensure legacy project has files in DB
    await migrateLegacyProjectToDB(website);

    // Get all files
    const files = await FileModel.find({ projectId: websiteId }).lean();
    if (!files || files.length === 0) {
      return sendError(res, "NO_FILES_FOUND", "No files found to export", 404);
    }

    // Transpile/Scaffold if needed
    const exportFiles = getExportFiles(files, exportType, website.title);

    // Initialize Octokit client
    const octokit = new Octokit({ auth: githubToken });

    // Validate the token and get the authenticated user's login name
    let username;
    try {
      const { data: githubUser } = await octokit.users.getAuthenticated();
      username = githubUser.login;
    } catch (err) {
      return sendError(res, "GITHUB_AUTH_FAILED", "Invalid GitHub Personal Access Token", 401);
    }

    // Create the repository under the user's account
    let repo;
    try {
      const createRes = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: isPrivate,
        auto_init: false, // Don't create README.md to keep it empty
      });
      repo = createRes.data;
    } catch (err) {
      console.error("Repository creation failed:", err.message);
      return sendError(
        res,
        "GITHUB_REPO_CREATE_FAILED",
        err.message.includes("name already exists")
          ? `Repository '${repoName}' already exists on your account`
          : `Failed to create repository: ${err.message}`,
        400
      );
    }

    // Push files to repository
    // In an empty repository, there is no default branch.
    // Pushing the first file synchronously creates the branch (main).
    // Sort files to commit a default entry like index.html or package.json first.
    const sortedFiles = [...exportFiles].sort((a, b) => {
      if (a.path === "index.html" || a.path === "package.json") return -1;
      if (b.path === "index.html" || b.path === "package.json") return 1;
      return a.path.localeCompare(b.path);
    });

    try {
      // 1. Commit the first file to establish the branch
      const firstFile = sortedFiles[0];
      await octokit.repos.createOrUpdateFileContents({
        owner: username,
        repo: repoName,
        path: firstFile.path,
        message: `Initial commit - create ${firstFile.path}`,
        content: Buffer.from(firstFile.content || "").toString("base64"),
        branch: "main",
      });

      // 2. Commit the remaining files sequentially
      const otherFiles = sortedFiles.slice(1);
      for (const file of otherFiles) {
        await octokit.repos.createOrUpdateFileContents({
          owner: username,
          repo: repoName,
          path: file.path,
          message: `Add ${file.path}`,
          content: Buffer.from(file.content || "").toString("base64"),
          branch: "main",
        });
      }
    } catch (err) {
      console.error("File commit failed:", err.message);
      // Clean up the created repository if we failed to push any file to avoid leaving a stale empty repo
      try {
        await octokit.repos.delete({ owner: username, repo: repoName });
      } catch (delErr) {
        console.error("Failed to clean up repository after commit failure:", delErr.message);
      }
      return sendError(res, "GITHUB_PUSH_FAILED", `Failed to push project files: ${err.message}`, 500);
    }

    return sendSuccess(res, {
      message: `Project successfully exported to GitHub repository: ${repo.full_name}`,
      repoUrl: repo.html_url,
      repoName: repo.full_name,
    });
  } catch (error) {
    console.error("exportToGithub error:", error.message);
    return sendError(res, "EXPORT_FAILED", "Server error during GitHub export", 500);
  }
};

// ─── Accept AI Chat Edit ────────────────────────────────────────────────────
export const acceptChatEdit = async (req, res) => {
  let creditsReserved = false;
  const CHAT_COST = 2;

  try {
    const { projectId, instruction, message, tokensUsed, files } = req.body;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    // Deduct credits for the accepted change
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, credits: { $gte: CHAT_COST } },
      { $inc: { credits: -CHAT_COST } },
      { new: true }
    );

    if (!user) {
      return sendError(res, "INSUFFICIENT_CREDITS", "Not enough credits. Minimum 2 credits required.", 402);
    }
    creditsReserved = true;

    await migrateLegacyProjectToDB(website);

    const filesChangedPaths = [];
    for (const file of files) {
      const filePath = file.path;
      const fileContent = file.content || "";
      const fileLanguage = getLanguageFromPath(filePath);

      let dbFile = await FileModel.findOne({ projectId, path: filePath });
      if (dbFile) {
        dbFile.previousContent = dbFile.content;
        dbFile.content = fileContent;
        dbFile.language = fileLanguage;
        await dbFile.save();
      } else {
        dbFile = await FileModel.create({
          projectId,
          path: filePath,
          content: fileContent,
          previousContent: "__NEW_FILE__",
          language: fileLanguage,
        });
        website.files.push(dbFile._id);
      }
      filesChangedPaths.push(filePath);
    }

    const updatedFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(updatedFiles);
    await website.save();

    // Log chat messages
    await Chat.create({
      projectId,
      userId: req.user._id,
      role: "user",
      message: instruction,
    });

    const assistantChat = await Chat.create({
      projectId,
      userId: req.user._id,
      role: "assistant",
      message,
      filesChanged: filesChangedPaths,
      tokensUsed: tokensUsed || 0,
    });

    await CreditTransaction.create({
      user: req.user._id,
      type: "debit",
      amount: CHAT_COST,
      balanceAfter: user.credits,
      reason: "website_chat",
      description: `Targeted edit via chat: ${instruction.slice(0, 60)}`,
      referenceId: website._id.toString(),
    });
    creditsReserved = false;

    return sendSuccess(res, {
      chat: assistantChat,
      remainingCredits: user.credits,
      latestCode: website.latestCode,
      filesChanged: filesChangedPaths,
    });
  } catch (error) {
    if (creditsReserved) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { credits: CHAT_COST } });
    }
    console.error("acceptChatEdit error:", error.message);
    return sendError(res, "ACCEPT_FAILED", "Server error committing edits", 500);
  }
};

// ─── Undo AI Chat Edit ──────────────────────────────────────────────────────
export const undoChatEdit = async (req, res) => {
  try {
    const { projectId } = req.params;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    // Find the latest assistant message
    const lastAssistantMsg = await Chat.findOne({ projectId, role: "assistant" }).sort({ createdAt: -1 });
    if (!lastAssistantMsg) {
      return sendError(res, "NO_CHANGES_TO_UNDO", "No chat changes to undo", 400);
    }

    // Find the user message right before it
    const lastUserMsg = await Chat.findOne({
      projectId,
      role: "user",
      createdAt: { $lt: lastAssistantMsg.createdAt }
    }).sort({ createdAt: -1 });

    const filesChanged = lastAssistantMsg.filesChanged || [];
    for (const filePath of filesChanged) {
      const dbFile = await FileModel.findOne({ projectId, path: filePath });
      if (dbFile) {
        if (dbFile.previousContent === "__NEW_FILE__") {
          // Delete newly created file
          await FileModel.deleteOne({ _id: dbFile._id });
          website.files = website.files.filter(id => id.toString() !== dbFile._id.toString());
        } else if (dbFile.previousContent !== null) {
          // Restore previous content
          dbFile.content = dbFile.previousContent;
          dbFile.previousContent = null;
          await dbFile.save();
        }
      }
    }

    const updatedFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(updatedFiles);
    await website.save();

    // Delete the chat messages from history
    await Chat.deleteOne({ _id: lastAssistantMsg._id });
    if (lastUserMsg) {
      await Chat.deleteOne({ _id: lastUserMsg._id });
    }

    return sendSuccess(res, {
      message: "Undo completed successfully",
      latestCode: website.latestCode,
    });
  } catch (error) {
    console.error("undoChatEdit error:", error.message);
    return sendError(res, "UNDO_FAILED", "Server error undoing changes", 500);
  }
};

// ─── AI Project Intelligence Layer Stack Analysis ───────────────────────────
export const analyzeStack = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.length < 10) {
      return sendError(res, "INVALID_PROMPT", "Prompt must be at least 10 characters", 400);
    }

    const analysisPrompt = `
You are a Lead Software Architect. Recommend the optimal software architecture and tech stack for this user request.

USER REQUEST: ${prompt}

Analyze the project requirements and determine:
1. Best Frontend framework (e.g. React/Vite, Next.js, Vue, Angular, Svelte, HTML/CSS/JS)
2. Best Backend framework (e.g. Express.js, NestJS, Flask, Django, Spring Boot, Laravel, Go Fiber, None/Serverless)
3. Best Database (e.g. MongoDB, PostgreSQL, MySQL, Firebase, None)
4. Optimal folder structure configuration
5. Best deployment strategy (e.g. Vercel, Render, AWS, Heroku)
6. Key performance and scalability optimization strategies

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{
  "recommendedStack": {
    "frontend": "React/Vite",
    "backend": "Express.js",
    "database": "MongoDB",
    "architecture": "Single Page Application with REST API",
    "folderStructure": "Client-Server structure",
    "deployment": "Vercel (Frontend) & Render (Backend)",
    "optimization": "MongoDB Indexes, Redis Caching, CDN asset caching"
  },
  "explanation": "Detailed professional explanation of why this stack is selected based on complexity, traffic and standards.",
  "alternatives": [
    {
      "stack": "Next.js + PostgreSQL",
      "reason": "If Server-Side Rendering (SSR) or SEO is highly prioritized."
    }
  ]
}
`;

    const result = await callOpenRouter({
      prompt: analysisPrompt,
      model: "google/gemini-2.5-flash",
      providerName: "Gemini",
      systemPrompt: "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
    });

    if (result.success) {
      const parsed = extractJson(result.content);
      if (parsed) {
        return sendSuccess(res, parsed);
      }
    }
    return sendError(res, "ANALYSIS_FAILED", "AI returned an invalid analysis. Please try again.", 400);
  } catch (error) {
    console.error("analyzeStack error:", error.message);
    return sendError(res, "SERVER_ERROR", "Server error during stack analysis", 500);
  }
};

// ─── Project Version Control Endpoints ─────────────────────────────────────
export const saveVersion = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { label, description } = req.body;

    const website = await Website.findOne({
      _id: projectId,
      $or: [
        { user: req.user._id },
        { "members.user": req.user._id }
      ]
    });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    await migrateLegacyProjectToDB(website);
    const files = await FileModel.find({ projectId }).lean();

    const versionFiles = files.map(f => ({
      path: f.path,
      content: f.content,
      language: f.language,
    }));

    const version = await Version.create({
      projectId,
      label: label || `Snapshot ${new Date().toLocaleString()}`,
      description: description || "",
      files: versionFiles,
      createdBy: req.user._id,
    });

    return sendSuccess(res, {
      message: "Version saved successfully",
      version: {
        _id: version._id,
        label: version.label,
        description: version.description,
        createdAt: version.createdAt,
      },
    }, 201);
  } catch (error) {
    console.error("saveVersion error:", error.message);
    return sendError(res, "VERSION_SAVE_FAILED", "Server error saving version", 500);
  }
};

export const listVersions = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const website = await Website.findOne({
      _id: projectId,
      $or: [
        { user: req.user._id },
        { "members.user": req.user._id }
      ]
    });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role) {
      return sendError(res, "ACCESS_DENIED", "You do not have access to this project", 403);
    }

    const versions = await Version.find({ projectId })
      .select("-files")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, { versions });
  } catch (error) {
    console.error("listVersions error:", error.message);
    return sendError(res, "VERSION_LIST_FAILED", "Server error listing versions", 500);
  }
};

export const restoreVersion = async (req, res) => {
  try {
    const { projectId, versionId } = req.params;

    const website = await Website.findOne({
      _id: projectId,
      $or: [
        { user: req.user._id },
        { "members.user": req.user._id }
      ]
    });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    const version = await Version.findOne({ _id: versionId, projectId });
    if (!version) {
      return sendError(res, "VERSION_NOT_FOUND", "Version snapshot not found", 404);
    }

    // Restore files:
    // 1. Delete all current files
    await FileModel.deleteMany({ projectId });

    // 2. Insert files from the version
    const restoredFiles = [];
    for (const vFile of version.files) {
      const dbFile = await FileModel.create({
        projectId,
        path: vFile.path,
        content: vFile.content,
        language: vFile.language,
      });
      restoredFiles.push(dbFile._id);
    }

    // 3. Update website files references and bundle code
    website.files = restoredFiles;
    const allFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(allFiles);
    await website.save();

    return sendSuccess(res, {
      message: "Version restored successfully",
      latestCode: website.latestCode,
    });
  } catch (error) {
    console.error("restoreVersion error:", error.message);
    return sendError(res, "VERSION_RESTORE_FAILED", "Server error restoring version", 500);
  }
};

// ─── Fork Project Endpoint ──────────────────────────────────────────────────
export const forkWebsite = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const originalWebsite = await Website.findOne({
      _id: projectId,
      $or: [
        { user: req.user._id },
        { "members.user": req.user._id }
      ]
    }).populate("files");
    if (!originalWebsite) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Original project not found or access denied", 404);
    }

    // Create cloned website document
    const forkedWebsite = new Website({
      user: req.user._id,
      title: `Fork of ${originalWebsite.title}`,
      conversation: [
        { role: "user", content: `Forked project from ${originalWebsite.title}` },
        { role: "ai", content: "Successfully forked workspace. You can now edit this project independently." }
      ],
      forkedFrom: originalWebsite._id,
      deployed: false,
    });

    await forkedWebsite.save();

    // Copy files
    let originalFiles = [];
    if (originalWebsite.files && originalWebsite.files.length > 0) {
      originalFiles = originalWebsite.files;
    } else {
      originalFiles = [{ path: "index.html", content: originalWebsite.latestCode || "", language: "html" }];
    }

    const newFileIds = [];
    for (const fileItem of originalFiles) {
      const clonedFile = await FileModel.create({
        projectId: forkedWebsite._id,
        path: fileItem.path,
        content: fileItem.content,
        language: fileItem.language || getLanguageFromPath(fileItem.path),
      });
      newFileIds.push(clonedFile._id);
    }

    forkedWebsite.files = newFileIds;
    const allFiles = await FileModel.find({ projectId: forkedWebsite._id });
    forkedWebsite.latestCode = bundleHTML(allFiles);
    await forkedWebsite.save();

    return sendSuccess(res, {
      message: "Project forked successfully",
      websiteId: forkedWebsite._id,
    }, 201);
  } catch (error) {
    console.error("forkWebsite error:", error.message);
    return sendError(res, "FORK_FAILED", "Server error forking project", 500);
  }
};

// ─── AI Debugger Repair Endpoint ───────────────────────────────────────────
export const debugWebsite = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { errorMessage, errorStack } = req.body;

    const website = await Website.findOne({
      _id: projectId,
      $or: [
        { user: req.user._id },
        { "members.user": req.user._id }
      ]
    });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    await migrateLegacyProjectToDB(website);
    const files = await FileModel.find({ projectId }).lean();
    const filesData = files.map(f => ({ path: f.path, content: f.content }));

    const debuggerPrompt = `
You are a Lead AI Debugger and Repair Agent.
The client application preview encountered a runtime exception:
Error Message: ${errorMessage || "Unknown error"}
Error Stack Trace: ${errorStack || "Not provided"}

Here are the current files in the workspace:
${JSON.stringify(filesData, null, 2)}

STRICT RULES:
1. Return ONLY the files that are modified to correct the exception.
2. DO NOT return empty files, placeholders, or snippets. Return the complete corrected content of the files.
3. If a file does not need change to fix the bug, do not return it.

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{
  "explanation": "A description of the bug and the implemented correction.",
  "files": [
    { "path": "script.js", "content": "<COMPLETE REPLACING CONTENT>" }
  ]
}
`;

    let parsed = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const currentPrompt = attempt === 0 ? debuggerPrompt : debuggerPrompt + "\n\nCRITICAL: RETURN ONLY RAW JSON. The JSON must contain a files array.";
      const result = await callOpenRouter({
        prompt: currentPrompt,
        model: "google/gemini-2.5-flash",
        providerName: "Gemini",
        systemPrompt: "You must return only valid raw JSON. No markdown. No explanation. No code blocks. The JSON must contain a files array.",
      });
      if (result.success) {
        parsed = extractJson(result.content);
        if (parsed && parsed.files) break;
      }
    }

    if (!parsed || !parsed.files) {
      return sendError(res, "DEBUG_FAILED", "AI failed to generate structural debug proposal.", 400);
    }

    // Prepare filesChanged structure for DiffPreviewModal
    const filesChanged = [];
    for (const responseFile of parsed.files) {
      const dbFile = await FileModel.findOne({ projectId, path: responseFile.path });
      const oldContent = dbFile ? dbFile.content : "";
      filesChanged.push({
        path: responseFile.path,
        oldContent,
        newContent: responseFile.content,
      });
    }

    return sendSuccess(res, {
      message: parsed.explanation || "Debugger proposed a bug fix.",
      filesChanged,
    });
  } catch (error) {
    console.error("debugWebsite error:", error.message);
    return sendError(res, "SERVER_ERROR", "Server error during debug repair", 500);
  }
};

// ─── Component Marketplace Endpoints ────────────────────────────────────────
export const saveComponentToMarketplace = async (req, res) => {
  try {
    const { name, description, category, code, tags, previewUrl } = req.body;
    if (!name || !code) {
      return sendError(res, "INVALID_INPUT", "Component name and code content are required", 400);
    }

    const component = await MarketplaceComponent.create({
      name,
      description: description || "",
      category: category || "Custom",
      code,
      authorId: req.user._id,
      tags: tags || [],
      previewUrl: previewUrl || "",
    });

    return sendSuccess(res, {
      message: "Component successfully saved to Marketplace",
      component,
    }, 201);
  } catch (error) {
    console.error("saveComponentToMarketplace error:", error.message);
    return sendError(res, "MARKETPLACE_SAVE_FAILED", "Server error saving component", 500);
  }
};

export const listMarketplaceComponents = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const components = await MarketplaceComponent.find(filter)
      .populate("authorId", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, { components });
  } catch (error) {
    console.error("listMarketplaceComponents error:", error.message);
    return sendError(res, "MARKETPLACE_LIST_FAILED", "Server error fetching components", 500);
  }
};

export const importMarketplaceComponent = async (req, res) => {
  try {
    const { projectId, componentId } = req.params;

    const website = await Website.findOne({
      _id: projectId,
      $or: [
        { user: req.user._id },
        { "members.user": req.user._id }
      ]
    });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }
    const role = getProjectRole(website, req.user._id);
    if (!role || role === "viewer") {
      return sendError(res, "ACCESS_DENIED", "You do not have write access to this project", 403);
    }

    const component = await MarketplaceComponent.findById(componentId);
    if (!component) {
      return sendError(res, "COMPONENT_NOT_FOUND", "Marketplace component not found", 404);
    }

    await migrateLegacyProjectToDB(website);

    // Create a new component file in the project
    const sanitizedName = component.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const targetPath = `components/${sanitizedName}.html`;

    const existing = await FileModel.findOne({ projectId, path: targetPath });
    let finalPath = targetPath;
    if (existing) {
      finalPath = `components/${sanitizedName}_${Date.now()}.html`;
    }

    const file = await FileModel.create({
      projectId,
      path: finalPath,
      content: component.code,
      language: "html",
    });

    website.files.push(file._id);
    const allFiles = await FileModel.find({ projectId });
    website.latestCode = bundleHTML(allFiles);
    await website.save();

    return sendSuccess(res, {
      message: "Component imported successfully",
      file,
      latestCode: website.latestCode,
    }, 201);
  } catch (error) {
    console.error("importMarketplaceComponent error:", error.message);
    return sendError(res, "MARKETPLACE_IMPORT_FAILED", "Server error importing component", 500);
  }
};

// Helper for role-based access control
export const getProjectRole = (website, userId) => {
  if (!website || !userId) return null;
  if (website.user.toString() === userId.toString()) return "owner";
  const member = website.members?.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// ─── Team Collaboration Endpoints ───────────────────────────────────────────
export const addCollaborator = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { email, role } = req.body;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }

    // Only owner can manage collaborators
    if (website.user.toString() !== req.user._id.toString()) {
      return sendError(res, "ACCESS_DENIED", "Only project owner can manage collaborators", 403);
    }

    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return sendError(res, "USER_NOT_FOUND", "User with this email does not exist", 404);
    }

    if (targetUser._id.toString() === website.user.toString()) {
      return sendError(res, "INVALID_ACTION", "Owner is already a collaborator", 400);
    }

    const alreadyMember = website.members.some(m => m.user.toString() === targetUser._id.toString());
    if (alreadyMember) {
      return sendError(res, "ALREADY_MEMBER", "User is already a collaborator", 409);
    }

    website.members.push({
      user: targetUser._id,
      role: role || "editor",
    });

    await website.save();

    return sendSuccess(res, {
      message: "Collaborator added successfully",
      member: {
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: targetUser.avatar,
        },
        role: role || "editor",
      },
    }, 201);
  } catch (error) {
    console.error("addCollaborator error:", error.message);
    return sendError(res, "COLLABORATOR_ADD_FAILED", "Server error adding collaborator", 500);
  }
};

export const listCollaborators = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const website = await Website.findById(projectId)
      .populate("user", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }

    const role = getProjectRole(website, req.user._id);
    if (!role) {
      return sendError(res, "ACCESS_DENIED", "You do not have access to this project", 403);
    }

    return sendSuccess(res, {
      owner: website.user,
      members: website.members,
    });
  } catch (error) {
    console.error("listCollaborators error:", error.message);
    return sendError(res, "COLLABORATORS_LIST_FAILED", "Server error fetching collaborators", 500);
  }
};

export const removeCollaborator = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }

    // Only owner can manage collaborators
    if (website.user.toString() !== req.user._id.toString()) {
      return sendError(res, "ACCESS_DENIED", "Only project owner can manage collaborators", 403);
    }

    website.members = website.members.filter(m => m.user.toString() !== userId);
    await website.save();

    return sendSuccess(res, { message: "Collaborator removed successfully" });
  } catch (error) {
    console.error("removeCollaborator error:", error.message);
    return sendError(res, "COLLABORATOR_REMOVE_FAILED", "Server error removing collaborator", 500);
  }
};

// ─── Export Framework Transpilation Helper ──────────────────────────────────
export const getExportFiles = (originalFiles, exportType, projectTitle) => {
  const sanitizedTitle = projectTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") || "project";

  if (exportType === "react") {
    const files = [];

    // package.json
    files.push({
      path: "package.json",
      content: JSON.stringify({
        name: sanitizedTitle,
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "^0.344.0"
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          autoprefixer: "^10.4.18",
          postcss: "^8.4.35",
          tailwindcss: "^3.4.1",
          vite: "^5.1.4"
        }
      }, null, 2)
    });

    // vite.config.js
    files.push({
      path: "vite.config.js",
      content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});`
    });

    // tailwind.config.js
    files.push({
      path: "tailwind.config.js",
      content: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: [\n    "./index.html",\n    "./src/**/*.{js,ts,jsx,tsx}",\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}`
    });

    // postcss.config.js
    files.push({
      path: "postcss.config.js",
      content: `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}`
    });

    // index.html
    files.push({
      path: "index.html",
      content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${projectTitle}</title>\n  </head>\n  <body class="bg-black text-white">\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>`
    });

    // src/main.jsx
    files.push({
      path: "src/main.jsx",
      content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.jsx'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n)`
    });

    // src/index.css
    const cssContent = originalFiles.find(f => f.path === "style.css")?.content || "";
    files.push({
      path: "src/index.css",
      content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n/* Custom Styles */\n${cssContent}`
    });

    // Translate HTML files into React JSX components
    originalFiles.forEach(file => {
      if (file.path.endsWith(".html")) {
        const baseName = file.path.replace(".html", "");
        const componentName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

        let bodyContent = file.content;
        const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(file.content);
        if (bodyMatch) {
          bodyContent = bodyMatch[1];
        }

        // Remove relative script tags
        bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

        const scriptContent = originalFiles.find(f => f.path === "script.js")?.content || "";

        files.push({
          path: `src/components/${componentName}.jsx`,
          content: `import React, { useEffect } from 'react';\n\nexport default function ${componentName}() {\n  useEffect(() => {\n    ${scriptContent.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\n  }, []);\n\n  return (\n    <div dangerouslySetInnerHTML={{ __html: \`${bodyContent.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\` }} />\n  );\n}`
        });
      }
    });

    // src/App.jsx router
    const htmlFiles = originalFiles.filter(f => f.path.endsWith(".html"));
    const imports = htmlFiles.map(f => {
      const baseName = f.path.replace(".html", "");
      const name = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      return `import ${name} from './components/${name}';`;
    }).join("\n");

    const routes = htmlFiles.map(f => {
      const baseName = f.path.replace(".html", "");
      const name = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      const routePath = f.path === "index.html" ? "/" : `/${baseName}`;
      return `  if (path === '${routePath}') return <${name} />;\n`;
    }).join("");

    files.push({
      path: "src/App.jsx",
      content: `import React, { useState, useEffect } from 'react';\n${imports}\n\nexport default function App() {\n  const [path, setPath] = useState(window.location.pathname);\n\n  useEffect(() => {\n    const handleLocationChange = () => {\n      setPath(window.location.pathname);\n    };\n    window.addEventListener('popstate', handleLocationChange);\n    return () => window.removeEventListener('popstate', handleLocationChange);\n  }, []);\n\n  // Intercept links\n  useEffect(() => {\n    const handleLinkClick = (e) => {\n      const anchor = e.target.closest('a');\n      if (anchor && anchor.getAttribute('href')) {\n        const href = anchor.getAttribute('href').trim();\n        if (href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('//')) {\n          e.preventDefault();\n          const newPath = href === 'index.html' ? '/' : '/' + href.replace('.html', '');\n          window.history.pushState({}, '', newPath);\n          setPath(newPath);\n        }\n      }\n    };\n    document.addEventListener('click', handleLinkClick);\n    return () => document.removeEventListener('click', handleLinkClick);\n  }, []);\n\n${routes}\n  return <div className="p-8 text-center">Page Not Found</div>;\n}`
    });

    return files;
  } else if (exportType === "nextjs") {
    const files = [];

    // package.json
    files.push({
      path: "package.json",
      content: JSON.stringify({
        name: sanitizedTitle,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start"
        },
        dependencies: {
          next: "^14.1.0",
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "^0.344.0"
        },
        devDependencies: {
          autoprefixer: "^10.4.18",
          postcss: "^8.4.35",
          tailwindcss: "^3.4.1"
        }
      }, null, 2)
    });

    // tailwind.config.js
    files.push({
      path: "tailwind.config.js",
      content: `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: [\n    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}`
    });

    // postcss.config.js
    files.push({
      path: "postcss.config.js",
      content: `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}`
    });

    // src/app/globals.css
    const cssContent = originalFiles.find(f => f.path === "style.css")?.content || "";
    files.push({
      path: "src/app/globals.css",
      content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n${cssContent}`
    });

    // src/app/layout.jsx
    files.push({
      path: "src/app/layout.jsx",
      content: `import './globals.css'\n\nexport const metadata = {\n  title: '${projectTitle}',\n  description: 'Generated by Velora AI',\n}\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang="en">\n      <body className="bg-black text-white">{children}</body>\n    </html>\n  )\n}`
    });

    // Translate each page to Next.js routes
    originalFiles.forEach(file => {
      if (file.path.endsWith(".html")) {
        const baseName = file.path.replace(".html", "");
        const isIndex = file.path === "index.html";
        const routePath = isIndex ? "src/app" : `src/app/${baseName}`;

        let bodyContent = file.content;
        const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(file.content);
        if (bodyMatch) {
          bodyContent = bodyMatch[1];
        }

        bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        const scriptContent = originalFiles.find(f => f.path === "script.js")?.content || "";

        files.push({
          path: `${routePath}/page.jsx`,
          content: `"use client";\nimport React, { useEffect } from 'react';\n\nexport default function Page() {\n  useEffect(() => {\n    ${scriptContent.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\n  }, []);\n\n  // Intercept navigation\n  useEffect(() => {\n    const handleLinkClick = (e) => {\n      const anchor = e.target.closest('a');\n      if (anchor && anchor.getAttribute('href')) {\n        const href = anchor.getAttribute('href').trim();\n        if (href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('//')) {\n          e.preventDefault();\n          const target = href === 'index.html' ? '/' : '/' + href.replace('.html', '');\n          window.location.href = target;\n        }\n      }\n    };\n    document.addEventListener('click', handleLinkClick);\n    return () => document.removeEventListener('click', handleLinkClick);\n  }, []);\n\n  return (\n    <div dangerouslySetInnerHTML={{ __html: \`${bodyContent.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\` }} />\n  );\n}`
        });
      }
    });

    return files;
  }

  return originalFiles;
};

// ─── AI Website Auditor Endpoint ─────────────────────────────────────────────
export const auditWebsite = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }

    await migrateLegacyProjectToDB(website);
    const files = await FileModel.find({ projectId }).lean();
    const filesData = files.map(f => ({ path: f.path, content: f.content.slice(0, 10000) })); // Truncate content to avoid token blowouts

    const auditPrompt = `
You are an expert Google Lighthouse Auditor, WCAG 2.1 Accessibility Specialist, and UX Architect.
Perform a detailed audit on the following files for the project '${website.title}':
${JSON.stringify(filesData, null, 2)}

Run checks for:
1. SEO (headings, title, description, tags, alt images)
2. Accessibility (a11y - contrast, screen reader labels, form labels, landmarks)
3. Performance (redundant scripts, deferred logic, css nesting)
4. UX/Best Practices (navigation, mobile responsiveness elements, layout consistency)

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{
  "seo": 80,
  "accessibility": 75,
  "performance": 85,
  "ux": 80,
  "details": {
    "seo": ["Add a meta description to index.html", "Specify alt attributes for images"],
    "accessibility": ["Ensure contrast ratios on primary text are readable", "Add aria-label attributes to icon-only buttons"],
    "performance": ["Optimize third-party CDN loading links", "Defer execution of heavy javascript code"],
    "ux": ["Provide clear feedback on interactive clicks", "Ensure consistent margins on mobile layout cards"]
  },
  "recommendations": [
    {
      "category": "SEO",
      "issue": "Missing meta description",
      "fix": "Add <meta name='description' content='Brief description...' /> in index.html head."
    }
  ]
}
`;

    const result = await callOpenRouter({
      prompt: auditPrompt,
      model: "google/gemini-2.5-flash",
      providerName: "Gemini",
      systemPrompt: "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
    });

    if (result.success) {
      const parsed = extractJson(result.content);
      if (parsed) {
        return sendSuccess(res, parsed);
      }
    }

    return sendError(res, "AUDIT_FAILED", "AI failed to generate a formatted audit report.", 400);
  } catch (error) {
    console.error("auditWebsite error:", error.message);
    return sendError(res, "SERVER_ERROR", "Server error during AI audit", 500);
  }
};

// ─── AI Brand Generator Endpoint ─────────────────────────────────────────────
export const generateBrand = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { prompt } = req.body;

    if (!prompt) {
      return sendError(res, "INVALID_INPUT", "Brand prompt description is required", 400);
    }

    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Project not found", 404);
    }

    const brandPrompt = `
You are a Principal Brand Identity Designer.
Generate a high-end, premium brand kit based on this directive: '${prompt}'.

Include:
1. Color palette (HEX formats for primary, secondary, background, text, and neutral shades).
2. Google Font selection (Headings and body font family with import links).
3. Border radius (e.g., '8px', '16px') and box shadow specifications.
4. Professional vector logo ideas and motifs.

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{
  "colors": {
    "primary": "#6366f1",
    "secondary": "#a855f7",
    "background": "#09090b",
    "text": "#f4f4f5",
    "neutral": "#18181b"
  },
  "typography": {
    "headingFont": "Outfit",
    "bodyFont": "Inter",
    "headingLink": "https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap",
    "bodyLink": "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
  },
  "styles": {
    "borderRadius": "16px",
    "boxShadow": "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
  },
  "logoRecommendation": "A minimalist abstract shape representing infinity or connectivity."
}
`;

    const result = await callOpenRouter({
      prompt: brandPrompt,
      model: "google/gemini-2.5-flash",
      providerName: "Gemini",
      systemPrompt: "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
    });

    if (result.success) {
      const parsed = extractJson(result.content);
      if (parsed) {
        // Save the brand details to project metadata
        website.brand = {
          colors: [parsed.colors.primary, parsed.colors.secondary, parsed.colors.background],
          font: parsed.typography.bodyFont,
          logoUrl: "", // metadata suggestion only
        };
        await website.save();

        return sendSuccess(res, parsed);
      }
    }

    return sendError(res, "BRAND_FAILED", "AI failed to generate a formatted brand configuration.", 400);
  } catch (error) {
    console.error("generateBrand error:", error.message);
    return sendError(res, "SERVER_ERROR", "Server error during brand generation", 500);
  }
};