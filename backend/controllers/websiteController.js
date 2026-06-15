// PATH: backend/controllers/websiteController.js

import { providerFactory } from "../services/ai/providerFactory.js";
import { callAIWithFallback } from "../config/openRouter.js";
import extractJson from "../utils/extractJson.js";
import { Website } from "../models/websiteModel.js";
import { User } from "../models/userModel.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { isValidObjectId, parsePagination, validateText } from "../utils/validation.js";

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

const getProviderNameFromModel = (model) => {
    if (model.includes("gemini")) return "gemini";
    if (model.includes("deepseek")) return "deepseek";
    if (model.includes("llama")) return "llama";
    if (model.includes("mistral")) return "mistral";
    if (model.includes("kimi") || model.includes("moonshot")) return "kimi";
    if (model.includes("minimax")) return "minimax";
    if (model.includes("qwen")) return "qwen";
    return "gemini";
};

const generateResponse = async (prompt, model, userId) => {
    if (model && model.includes("deepseek")) {
        return await callAIWithFallback(prompt, { userId });
    }
    const providerName = getProviderNameFromModel(model);
    const provider = providerFactory(providerName);
    const result = await provider.generate({ prompt, model });
    return result.content;
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
BUILD A HIGH-END PRODUCTION-GRADE WEBSITE USING ONLY HTML, CSS, AND JAVASCRIPT IN A SINGLE FILE.

USER REQUIREMENT: ${prompt}

CODE STYLE REQUIREMENT:
${langInstructions || "Use clean semantic HTML5, vanilla CSS3, and vanilla JavaScript ES6+."}

STRICT TECHNICAL RULES:
- ONE single HTML file with inline <style> and <script> tags only
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
{"message":"Short professional confirmation message","code":"<FULL VALID HTML DOCUMENT>"}

IF YOU RETURN ANYTHING OTHER THAN RAW JSON → RESPONSE IS INVALID.
`;

        let parsed = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const raw = await generateResponse(
                attempt === 0 ? masterPrompt : masterPrompt + "\n\nCRITICAL: RETURN ONLY RAW JSON. NO MARKDOWN. NO BACKTICKS.",
                model,
                req.user._id
            );
            parsed = extractJson(raw);
            if (parsed && parsed.code) break;
        }

        if (!parsed || !parsed.code) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: GENERATE_COST } });
            creditsReserved = false;
            return sendError(res, "INVALID_AI_RESPONSE", "AI returned an invalid response. Please try again.", 400);
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
        const website = await Website.findOne({ _id: id, user: req.user._id }).lean();
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
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

        const website = await Website.findOne({ _id: id, user: req.user._id });
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);

        const user = await User.findOneAndUpdate(
            { _id: req.user._id, credits: { $gte: UPDATE_COST } },
            { $inc: { credits: -UPDATE_COST } },
            { new: true }
        );

        if (!user) return sendError(res, "INSUFFICIENT_CREDITS", "Not enough credits. Minimum 5 credits required.", 400);
        creditsReserved = true;

        const updatePrompt = `
UPDATE THIS EXISTING WEBSITE BASED ON THE USER REQUEST BELOW.

CURRENT HTML CODE:
${website.latestCode}

USER REQUEST:
${prompt}

CODE STYLE: ${langInstructions || "Keep existing code style"}

STRICT RULES:
- Return the COMPLETE updated HTML file (not just changed parts)
- Keep all existing sections unless explicitly asked to remove
- Maintain responsive structure and navigation
- Use only HTTPS URLs for ALL resources/images
- Apply the requested changes precisely

OUTPUT FORMAT — RETURN RAW JSON ONLY. NO MARKDOWN. NO BACKTICKS:
{"message":"Short confirmation of what was changed","code":"<FULL UPDATED HTML DOCUMENT>"}
`;

        let parsed = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const raw = await generateResponse(
                attempt === 0 ? updatePrompt : updatePrompt + "\n\nRETURN ONLY RAW JSON.",
                model,
                req.user._id
            );
            parsed = extractJson(raw);
            if (parsed && parsed.code) break;
        }

        if (!parsed || !parsed.code) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { credits: UPDATE_COST } });
            creditsReserved = false;
            return sendError(res, "INVALID_AI_RESPONSE", "AI returned an invalid response. Please try again.", 400);
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

        return sendSuccess(res, { message: parsed.message, code: parsed.code, remainingCredits: user.credits });

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
        const website = await Website.findOne({ slug: slugValidation.value, deployed: true }).lean();
        if (!website) return sendError(res, "WEBSITE_NOT_FOUND", "Website not found", 404);
        return sendSuccess(res, { website });
    } catch (error) {
        console.error("getBySlug error:", error.message);
        return sendError(res, "WEBSITE_FETCH_FAILED", "Server error", 500);
    }
};