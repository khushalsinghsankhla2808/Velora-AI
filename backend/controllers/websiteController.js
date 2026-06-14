// PATH: backend/controllers/websiteController.js
import { generateResponse } from "../config/openRouter.js";
import { CreditTransaction } from "../models/creditTransactionModel.js";
import { User } from "../models/userMODEL.js";
import { Website } from "../models/websiteModel.js";
import extractJson from "../utils/extractJson.js";

const CODE_PREFERENCES = {
  "html-css-js":
    "Use clean semantic HTML, modern CSS, and simple vanilla JavaScript.",
  javascript:
    "Use a JavaScript-focused structure with clear functions, DOM rendering helpers, and minimal repeated markup.",
  typescript:
    "Use TypeScript-inspired organization and naming, but output browser-compatible JavaScript only because the preview runs without a build step.",
  react:
    "Use React-style component thinking and component-like render functions, but output plain HTML/CSS/JavaScript that works directly in an iframe without React or a build step.",
  tailwind:
    "Use Tailwind-inspired utility class naming and compact utility-style CSS, but define all styles locally because external CSS frameworks are not allowed.",
};

const ALLOWED_CODE_PREFERENCES = new Set([
  ...Object.keys(CODE_PREFERENCES),
  "keep",
]);

export const generateWebsite = async (req, res) => {
  try {
    const { prompt, codePreference = "html-css-js" } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const selectedCodePreference = ALLOWED_CODE_PREFERENCES.has(codePreference)
      ? codePreference
      : "html-css-js";
    const codeInstruction = CODE_PREFERENCES[selectedCodePreference];

    const user = await User.findById(req.user._id);

    if (user.credits < 10) {
      return res.status(400).json({ message: "Not enough credits" });
    }

    const masterPrompt = `YOU ARE A PRINCIPAL FRONTEND ARCHITECT AND SENIOR UI/UX ENGINEER.
BUILD A HIGH-END PRODUCTION-GRADE WEBSITE USING ONLY HTML, CSS, AND JAVASCRIPT.
USER REQUIREMENT: {USER_PROMPT}
PROGRAMMING PREFERENCE: {CODE_INSTRUCTION}
RULES:
- ONE single HTML file with ONE style tag and ONE script tag
- Fully responsive: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Mobile-first CSS, CSS Grid/Flexbox, relative units, media queries
- SPA with JS navigation - Home, About, Services, Contact pages
- At least ONE page visible on initial load without user interaction
- Smooth page transitions via JS (no page reloads)
- High-quality Unsplash images: https://images.unsplash.com/photo-XXXXX?auto=format&fit=crop&w=1200&q=80
- NO frameworks, NO libraries, NO lorem ipsum, NO external CSS/JS/fonts
- iframe srcdoc compatible
- Business-ready content, modern UI (2025-2026 style)
- Form validation with JS
- Active nav state updates on page switch
OUTPUT FORMAT - RETURN RAW JSON ONLY, NO MARKDOWN:
{"message":"Short professional confirmation","code":"<FULL VALID HTML DOCUMENT>"}
IF FORMAT IS WRONG -> RESPONSE IS INVALID`;

    let raw;
    let parsed = null;
    let finalPrompt = masterPrompt
      .replace("{USER_PROMPT}", prompt)
      .replace("{CODE_INSTRUCTION}", codeInstruction);

    for (let i = 0; i < 2; i += 1) {
      raw = await generateResponse(finalPrompt);
      parsed = extractJson(raw);

      if (parsed) {
        break;
      }

      finalPrompt += "\n\nRETURN ONLY RAW JSON";
    }

    if (!parsed?.code) {
      return res.status(400).json({ message: "AI returned invalid response" });
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
    await CreditTransaction.create({
      user: user._id,
      type: "debit",
      amount: 10,
      balanceAfter: user.credits,
      reason: "website_generation",
      description: `Generated website: ${website.title}`,
      referenceId: website._id.toString(),
    });

    return res.status(201).json({
      websiteId: website._id,
      remainingCredits: user.credits,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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
    return res.status(500).json({ message: error.message });
  }
};

export const changeWebsite = async (req, res) => {
  try {
    const { prompt, codePreference = "keep" } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const selectedCodePreference = ALLOWED_CODE_PREFERENCES.has(codePreference)
      ? codePreference
      : "keep";
    const codeInstruction =
      selectedCodePreference === "keep"
        ? "Keep the existing code style unless the user's request explicitly asks to change it."
        : CODE_PREFERENCES[selectedCodePreference];

    const website = await Website.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!website) {
      return res.status(400).json({ message: "Website not found" });
    }

    const user = await User.findById(req.user._id);

    if (user.credits < 5) {
      return res.status(400).json({ message: "Not enough credits" });
    }

    let updatePrompt = `UPDATE THIS HTML WEBSITE.
CURRENT CODE:
${website.latestCode}
USER REQUEST:
${prompt}
PROGRAMMING PREFERENCE:
${codeInstruction}
RETURN RAW JSON ONLY: {"message":"Short confirmation","code":"<UPDATED FULL HTML>"}`;

    let raw;
    let parsed = null;

    for (let i = 0; i < 2; i += 1) {
      raw = await generateResponse(updatePrompt);
      parsed = extractJson(raw);

      if (parsed) {
        break;
      }

      updatePrompt += "\n\nRETURN ONLY RAW JSON";
    }

    if (!parsed?.code) {
      return res.status(400).json({ message: "AI returned invalid response" });
    }

    website.conversation.push(
      { role: "user", content: prompt },
      { role: "ai", content: parsed.message },
    );
    website.latestCode = parsed.code;
    await website.save();

    user.credits -= 5;
    await user.save();
    await CreditTransaction.create({
      user: user._id,
      type: "debit",
      amount: 5,
      balanceAfter: user.credits,
      reason: "website_update",
      description: `Updated website: ${website.title}`,
      referenceId: website._id.toString(),
    });

    return res.status(200).json({
      message: parsed.message,
      code: parsed.code,
      remainingCredits: user.credits,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllWebsite = async (req, res) => {
  try {
    const websites = await Website.find({ user: req.user._id });
    return res.status(200).json(websites);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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
        website.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60) +
        website._id.toString().slice(-5);
    }

    website.deployed = true;
    website.deployUrl = `${process.env.FRONTEND_URL}/site/${website.slug}`;
    await website.save();

    return res.status(200).json({ url: website.deployUrl });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getBySlug = async (req, res) => {
  try {
    const website = await Website.findOne({
      slug: req.params.slug,
      deployed: true,
    }).select("title latestCode slug updatedAt");

    if (!website) {
      return res.status(400).json({ message: "Website not found" });
    }

    return res.status(200).json(website);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
