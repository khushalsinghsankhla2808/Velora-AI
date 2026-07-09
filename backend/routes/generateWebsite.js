// PATH: backend/routes/generateWebsite.js
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildWebsiteGenSystemPrompt } from '../utils/websiteGenPrompt.js';

const router = express.Router();

// Initialize Gemini client — reuse across requests
// We wrap initialization or check key at request time to allow dynamic updates
const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(key);
};

// Use gemini-1.5-pro: best for large multi-file code generation (1M token context)
const GEMINI_MODEL = 'gemini-1.5-pro';

router.post('/', async (req, res) => {
  const { prompt, style, history = [] } = req.body;
  // Note: 'model' from req.body is intentionally ignored here —
  // website generation always uses Gemini. The model selector in the UI
  // only applies to Velora's existing OpenRouter chat features.

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const genAI = getGenAI();
  if (!genAI) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in backend/.env' });
  }

  const systemPrompt = buildWebsiteGenSystemPrompt(style);

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json', // Gemini's native JSON mode
        temperature: 0.3,                     // lower = more consistent structure
        maxOutputTokens: 8192                 // enough for ~15-20 files
      }
    });

    // Build chat history for iterative editing (Gemini format)
    // history entries must alternate: user → model → user → model
    const chatHistory = history.map((msg, i) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof msg.content === 'object'
        ? JSON.stringify(msg.content)
        : msg.content
      }]
    }));

    const chat = model.startChat({ history: chatHistory });

    const result = await chat.sendMessage(`Build this web app: ${prompt}`);
    const raw = result.response.text();

    // Gemini's JSON mode should return clean JSON, but strip fences defensively
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);
  } catch (err) {
    console.error('[generate-website] Gemini error:', err.message);

    if (err instanceof SyntaxError) {
      return res.status(500).json({
        error: 'Gemini returned malformed JSON. Try a simpler prompt or retry.'
      });
    }

    // Surface Gemini API errors clearly (quota exceeded, invalid key, etc.)
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    res.status(500).json({ error: err.message });
  }
});

export default router;
