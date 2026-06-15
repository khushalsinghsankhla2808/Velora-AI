// PATH: backend/controllers/websiteController.js

import { generateResponse } from "../config/openRouter.js";
import extractJson from "../utils/extractJson.js";
import { Website } from "../models/websiteModel.js";
import { User } from "../models/userMODEL.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { isValidObjectId, parsePagination, validateText } from "../utils/validation.js";

const GENERATE_COST = 10;
const UPDATE_COST = 5;
const ALLOWED_MODELS = new Set([
    "google/gemini-2.0-flash-exp:free",
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-4-maverick:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
]);
const ALLOWED_CODE_PREFERENCES = new Set([
    "keep",
    "html-css-js",
    "javascript",
    "typescript",
    "react",
    "tailwind",
]);

const validateModel = (model) => {
    if (!model) return "google/gemini-2.0-flash-exp:free";
    return ALLOWED_MODELS.has(model) ? model : null;
};

// ─── Generate Website ────────────────────────────────────────────────────────
export const generateWebsite = async (req, res) => {
    let creditsReserved = false;
    try {
        const promptValidation = validateText({
            value: req.body.prompt,
            field: "Prompt",
            min: 5,
            max: 3000,
        });

        if (!promptValidation.valid) {
            return sendError(res, "INVALID_PROMPT", promptValidation.message, 400);
        }

        const model = validateModel(req.body.model);
        if (!model) {
            return sendError(res, "INVALID_MODEL", "Selected AI model is not supported", 400);
        }
        const prompt = promptValidation.value;

        const user = await User.findOneAndUpdate(
            { _id: req.user._id, credits: { $gte: GENERATE_COST } },
            { $inc: { credits: -GENERATE_COST } },
            { new: true },
        );

        if (!user) {
            return sendError(
                res,
                "INSUFFICIENT_CREDITS",
                "Not enough credits. Minimum 10 credits required.",
                400,
            );
        }
        creditsReserved = true;

        const masterPrompt = `
YOU ARE A PRINCIPAL FRONTEND ARCHITECT AND SENIOR UI/UX ENGINEER.
BUILD A HIGH-END PRODUCTION-GRADE WEBSITE USING ONLY HTML, CSS, AND JAVASCRIPT.

USER REQUIREMENT: ${prompt}

STRICT RULES:
- ONE single HTML file with ONE <style> tag and ONE <script> tag
- Fully responsive: mobile (<768px), tablet (768–1024px), desktop (>1024px)
- Mobile-first CSS, CSS Grid/Flexbox, relative units, media queries
- SPA with JS navigation — Home, About, Services, Contact pages
- At least ONE page visible on initial load without user interaction
- Smooth page transitions using JavaScript (no page reloads)
- High-quality Unsplash images: https://images.unsplash.com/photo-XXXXX?auto=format&fit=crop&w=1200&q=80
- NO frameworks, NO libraries, NO lorem ipsum, NO external CSS/JS/fonts
- iframe srcdoc compatible (no external resource dependencies)
- Business-ready content, modern UI (2025–2026 design trends)
- Form validation with JavaScript
- Active nav state updates on page switch
- Smooth scroll, hover effects, subtle animations

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS. NO EXPLANATION:
{"message":"Short professional confirmation message","code":"<FULL VALID HTML DOCUMENT>"}

IF YOU RETURN ANYTHING OTHER THAN RAW JSON → RESPONSE IS INVALID.
`;

        let parsed = null;

        for (let attempt = 0; attempt < 2; attempt++) {
            const raw = await generateResponse(
                attempt === 0 ? masterPrompt : masterPrompt + "\n\nRETURN ONLY RAW JSON. NO MARKDOWN.",
                model  // ← Pass model here
            );
            parsed = extractJson(raw);
            if (parsed && parsed.code) break;
        }

        if (!parsed || !parsed.code) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: GENERATE_COST } });
            creditsReserved = false;
            return sendError(
                res,
                "INVALID_AI_RESPONSE",
                "AI returned an invalid response. Please try again.",
                400,
            );
        }

        const website = await Website.create({
            user: user._id,
            title: prompt.slice(0, 60),
            latestCode: parsed.code,
            conversation: [
                { role: "user", content: prompt },
                { role: "ai", content: parsed.message },
            ],
        });

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

        return sendSuccess(res, {
            websiteId: website._id,
            remainingCredits: user.credits,
        }, 201);

    } catch (error) {
        if (creditsReserved) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: GENERATE_COST } });
        }
        console.error("generateWebsite error:", error.message);
        return sendError(res, "GENERATION_FAILED", "Server error during generation", 500);
    }
};

// ─── Get Website By ID ───────────────────────────────────────────────────────
export const getWebsiteById = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return sendError(res, "INVALID_WEBSITE_ID", "Invalid website id", 400);
        }

        const website = await Website.findOne({
            _id: req.params.id,
            user: req.user._id,
        }).lean();

        if (!website) {
            return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
        }

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
        if (!isValidObjectId(req.params.id)) {
            return sendError(res, "INVALID_WEBSITE_ID", "Invalid website id", 400);
        }

        const promptValidation = validateText({
            value: req.body.prompt,
            field: "Prompt",
            min: 3,
            max: 3000,
        });

        if (!promptValidation.valid) {
            return sendError(res, "INVALID_PROMPT", promptValidation.message, 400);
        }

        const model = validateModel(req.body.model);
        if (!model) {
            return sendError(res, "INVALID_MODEL", "Selected AI model is not supported", 400);
        }

        const codePreference = ALLOWED_CODE_PREFERENCES.has(req.body.codePreference)
            ? req.body.codePreference
            : "keep";
        const prompt = promptValidation.value;

        const website = await Website.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!website) {
            return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
        }

        const user = await User.findOneAndUpdate(
            { _id: req.user._id, credits: { $gte: UPDATE_COST } },
            { $inc: { credits: -UPDATE_COST } },
            { new: true },
        );

        if (!user) {
            return sendError(
                res,
                "INSUFFICIENT_CREDITS",
                "Not enough credits. Minimum 5 credits required.",
                400,
            );
        }
        creditsReserved = true;

        const updatePrompt = `
UPDATE THIS EXISTING WEBSITE BASED ON THE USER REQUEST BELOW.

CURRENT HTML CODE:
${website.latestCode}

USER REQUEST:
${prompt}

CODE STYLE PREFERENCE:
${codePreference}

STRICT RULES:
- Return the COMPLETE updated HTML file (not just the changed parts)
- Keep all existing sections unless explicitly asked to remove them
- Maintain the same responsive structure and SPA navigation
- Apply the requested changes precisely

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{"message":"Short confirmation of what was changed","code":"<FULL UPDATED HTML DOCUMENT>"}
`;

        let parsed = null;

        for (let attempt = 0; attempt < 2; attempt++) {
            const raw = await generateResponse(
                attempt === 0 ? updatePrompt : updatePrompt + "\n\nRETURN ONLY RAW JSON.",
                model  // ← Pass model here
            );
            parsed = extractJson(raw);
            if (parsed && parsed.code) break;
        }

        if (!parsed || !parsed.code) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: UPDATE_COST } });
            creditsReserved = false;
            return sendError(
                res,
                "INVALID_AI_RESPONSE",
                "AI returned an invalid response. Please try again.",
                400,
            );
        }

        website.conversation.push(
            { role: "user", content: prompt },
            { role: "ai", content: parsed.message }
        );
        website.latestCode = parsed.code;
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

        return sendSuccess(res, {
            message: parsed.message,
            code: parsed.code,
            remainingCredits: user.credits,
        });

    } catch (error) {
        if (creditsReserved) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: UPDATE_COST } });
        }
        console.error("changeWebsite error:", error.message);
        return sendError(res, "UPDATE_FAILED", "Server error during update", 500);
    }
};

// ─── Get All Websites ────────────────────────────────────────────────────────
export const getAllWebsite = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query, {
            limit: 12,
            maxLimit: 30,
        });
        const filter = { user: req.user._id };
        const [websites, total] = await Promise.all([
            Website.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Website.countDocuments(filter),
        ]);

        return sendSuccess(res, {
            websites,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
            },
        });
    } catch (error) {
        console.error("getAllWebsite error:", error.message);
        return sendError(res, "WEBSITES_FETCH_FAILED", "Server error", 500);
    }
};

// ─── Deploy Website ───────────────────────────────────────────────────────────
export const deployWebsite = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return sendError(res, "INVALID_WEBSITE_ID", "Invalid website id", 400);
        }

        const website = await Website.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!website) {
            return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
        }

        if (!website.slug) {
            website.slug =
                website.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
                    .slice(0, 60) + website._id.toString().slice(-5);
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
        const slugValidation = validateText({
            value: req.params.slug,
            field: "Slug",
            min: 3,
            max: 100,
        });

        if (!slugValidation.valid || !/^[a-z0-9-]+$/.test(slugValidation.value)) {
            return sendError(res, "INVALID_SLUG", "Invalid site slug", 400);
        }

        const website = await Website.findOne({
            slug: slugValidation.value,
            deployed: true,
        }).lean();

        if (!website) {
            return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
        }

        return sendSuccess(res, { website });

    } catch (error) {
        console.error("getBySlug error:", error.message);
        return sendError(res, "WEBSITE_FETCH_FAILED", "Server error", 500);
    }
};
