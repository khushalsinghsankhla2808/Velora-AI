// PATH: backend/controllers/websiteController.js

import { callOpenRouter } from "../services/ai/openRouterClient.js";
import extractJson from "../utils/extractJson.js";
import { Website } from "../models/websiteModel.js";
import { User } from "../models/userModel.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { isValidObjectId, parsePagination, validateText } from "../utils/validation.js";
import { ensureWebsiteFiles, bundleHTML, saveWebsiteFiles, getLanguageFromPath } from "../utils/migrationHelper.js";
import { FileModel } from "../models/fileModel.js";
import { Chat } from "../models/chatModel.js";
// archiver is used to programmatically bundle and stream project files as a ZIP archive
import { ZipArchive } from "archiver";

const GENERATE_COST = 10;
const UPDATE_COST = 5;

// ✅ Updated — added Kimi, MiniMax, Qwen models
const ALLOWED_MODELS = new Set([
    "google/gemini-2.0-flash-exp:free",
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-4-maverick:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "moonshotai/kimi-vl-a3b-thinking:free",
    "minimax/minimax-01",
    "qwen/qwen3-235b-a22b:free",
]);

// ✅ Updated — added new language/style preferences
const ALLOWED_CODE_PREFERENCES = new Set([
    "keep",
    "html-css-js",
    "javascript",
    "typescript",
    "react",
    "tailwind",
    "vue",
    "bootstrap",
    "glassmorphism",
    "neumorphism",
    "material",
    "scss",
    "animations",
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
    if (!model) return "google/gemini-2.0-flash-exp:free";
    return ALLOWED_MODELS.has(model) ? model : null;
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
YOU ARE A PRINCIPAL FRONTEND ARCHITECT AND SENIOR UI/UX ENGINEER.
BUILD A HIGH-END PRODUCTION-GRADE WEBSITE. YOU MUST DELIVER MULTIPLE MODULAR FILES AS A PROJECT STRUCTURE (E.G., index.html, style.css, script.js).

USER REQUIREMENT: ${prompt}

CODE STYLE REQUIREMENT:
${langInstructions || "Use clean semantic HTML5, vanilla CSS3, and vanilla JavaScript ES6+."}

STRICT TECHNICAL RULES:
- Deliver modular, clean code separated into logical files (e.g. index.html, style.css, script.js).
- index.html must load the style.css stylesheet via a link tag and script.js script via a script tag.
- Fully responsive: mobile (<768px), tablet (768–1024px), desktop (>1024px)
- Mobile-first CSS, CSS Grid/Flexbox, relative units, media queries
- SPA with JavaScript navigation — Home, About, Services, Contact sections
- At least ONE section visible on initial load without any user interaction
- Smooth section transitions using JavaScript (no page reloads)
- HTTPS images only — use: https://images.unsplash.com/photo-XXXXX?auto=format&fit=crop&w=1200&q=80
- NO lorem ipsum text — write real, professional business content
- iframe srcdoc compatible (no external dependencies except where code style explicitly requires CDN)
- Modern UI design (2025–2026 standards)
- Form validation with JavaScript
- Active navigation state updates on section switch
- Smooth scroll, hover effects, and subtle animations
- Use only HTTPS URLs for ALL external resources

QUALITY RULES:
- Professional, business-ready content
- Pixel-perfect spacing and typography
- Accessible (aria labels, semantic HTML, contrast ratios)
- No broken layouts at any viewport size

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS. NO EXPLANATION:
{
  "message": "Short professional confirmation message",
  "files": [
    { "path": "index.html", "content": "<FULL VALID HTML DOCUMENT LINKING TO style.css AND script.js>" },
    { "path": "style.css", "content": "<CSS CONTENT>" },
    { "path": "script.js", "content": "<JS CONTENT>" }
  ]
}

IF YOU RETURN ANYTHING OTHER THAN RAW JSON → RESPONSE IS INVALID.
`;

        let parsed = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const currentPrompt = attempt === 0 ? masterPrompt : masterPrompt + "\n\nCRITICAL: RETURN ONLY RAW JSON. NO MARKDOWN. NO BACKTICKS.";
            const result = await callOpenRouter({
                prompt: currentPrompt,
                model: process.env.AI_PRIMARY_MODEL || "deepseek/deepseek-r1",
                providerName: "DeepSeek",
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
        const website = await Website.findOne({ _id: id, user: req.user._id }).populate("files").lean();
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

        const website = await Website.findOne({ _id: id, user: req.user._id }).populate("files");
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);

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
                model: process.env.AI_PRIMARY_MODEL || "deepseek/deepseek-r1",
                providerName: "DeepSeek",
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
        const filter = { user: req.user._id };
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
        const website = await Website.findOne({ _id: id, user: req.user._id });
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);

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
    const { projectId } = req.body;
    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId, fileId } = req.body;
    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId, path, content, language } = req.body;
    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId, fileId, content } = req.body;
    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId, fileId, newPath } = req.body;
    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId, fileId } = req.body;
    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId, path } = req.body;
    const website = await Website.findOne({ _id: projectId, user: req.user._id });
    if (!website) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId, instruction } = req.body;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    if (website.user.toString() !== req.user._id.toString()) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
        model: process.env.AI_PRIMARY_MODEL || "deepseek/deepseek-r1",
        providerName: "DeepSeek",
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
    const { projectId, before } = req.body;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    if (website.user.toString() !== req.user._id.toString()) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { websiteId } = req.body;

    const website = await Website.findById(websiteId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    if (website.user.toString() !== req.user._id.toString()) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
    }

    // Ensure legacy project has files in DB
    await migrateLegacyProjectToDB(website);

    // Get all files
    const files = await FileModel.find({ projectId: websiteId }).lean();
    if (!files || files.length === 0) {
      return sendError(res, "NO_FILES_FOUND", "No files found to export", 404);
    }

    // Standardize file name
    const sanitizedTitle = website.title
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50) || "website";

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedTitle}_export.zip"`
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

    for (const file of files) {
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
    if (website.user.toString() !== req.user._id.toString()) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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
    const { projectId } = req.body;

    const website = await Website.findById(projectId);
    if (!website) {
      return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
    }
    if (website.user.toString() !== req.user._id.toString()) {
      return sendError(res, "ACCESS_DENIED", "You do not own this project", 403);
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