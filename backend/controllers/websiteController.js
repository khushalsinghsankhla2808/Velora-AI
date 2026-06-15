// PATH: backend/controllers/websiteController.js

import { generateResponse } from "../config/openRouter.js";
import extractJson from "../utils/extractJson.js";
import { Website } from "../models/websiteModel.js";
import { User } from "../models/userMODEL.js";

// ─── Generate Website ────────────────────────────────────────────────────────
export const generateWebsite = async (req, res) => {
    try {
        const { prompt, model = "google/gemini-2.0-flash-exp:free" } = req.body;  // ← Added model

        if (!prompt) {
            return res.status(400).json({ message: "Prompt is required" });
        }

        const user = await User.findById(req.user._id);

        if (user.credits < 10) {
            return res.status(400).json({ message: "Not enough credits. Minimum 10 credits required." });
        }

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
            return res.status(400).json({ message: "AI returned an invalid response. Please try again." });
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

        user.credits -= 10;
        await user.save();

        return res.status(201).json({
            websiteId: website._id,
            remainingCredits: user.credits,
        });

    } catch (error) {
        console.error("generateWebsite error:", error.message);
        return res.status(500).json({ message: "Server error during generation" });
    }
};

// ─── Get Website By ID ───────────────────────────────────────────────────────
export const getWebsiteById = async (req, res) => {
    try {
        const website = await Website.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!website) {
            return res.status(400).json({ message: "Website not found" });
        }

        return res.status(200).json(website);

    } catch (error) {
        console.error("getWebsiteById error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// ─── Update / Change Website ─────────────────────────────────────────────────
export const changeWebsite = async (req, res) => {
    try {
        const { prompt, model = "google/gemini-2.0-flash-exp:free" } = req.body;  // ← Added model

        if (!prompt) {
            return res.status(400).json({ message: "Prompt is required" });
        }

        const website = await Website.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!website) {
            return res.status(400).json({ message: "Website not found" });
        }

        const user = await User.findById(req.user._id);

        if (user.credits < 5) {
            return res.status(400).json({ message: "Not enough credits. Minimum 5 credits required." });
        }

        const updatePrompt = `
UPDATE THIS EXISTING WEBSITE BASED ON THE USER REQUEST BELOW.

CURRENT HTML CODE:
${website.latestCode}

USER REQUEST:
${prompt}

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
            return res.status(400).json({ message: "AI returned an invalid response. Please try again." });
        }

        website.conversation.push(
            { role: "user", content: prompt },
            { role: "ai", content: parsed.message }
        );
        website.latestCode = parsed.code;
        await website.save();

        user.credits -= 5;
        await user.save();

        return res.status(200).json({
            message: parsed.message,
            code: parsed.code,
            remainingCredits: user.credits,
        });

    } catch (error) {
        console.error("changeWebsite error:", error.message);
        return res.status(500).json({ message: "Server error during update" });
    }
};

// ─── Get All Websites ────────────────────────────────────────────────────────
export const getAllWebsite = async (req, res) => {
    try {
        const websites = await Website.find({ user: req.user._id }).sort({ updatedAt: -1 });
        return res.status(200).json(websites);
    } catch (error) {
        console.error("getAllWebsite error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// ─── Deploy Website ───────────────────────────────────────────────────────────
export const deployWebsite = async (req, res) => {
    try {
        const website = await Website.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!website) {
            return res.status(400).json({ message: "Website not found" });
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

        return res.status(200).json({ url: website.deployUrl });

    } catch (error) {
        console.error("deployWebsite error:", error.message);
        return res.status(500).json({ message: "Server error during deployment" });
    }
};

// ─── Get By Slug (Public) ────────────────────────────────────────────────────
export const getBySlug = async (req, res) => {
    try {
        const website = await Website.findOne({ slug: req.params.slug });

        if (!website) {
            return res.status(400).json({ message: "Website not found" });
        }

        return res.status(200).json(website);

    } catch (error) {
        console.error("getBySlug error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};