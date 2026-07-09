import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildWebsiteGenSystemPrompt } from '../utils/websiteGenPrompt.js';

const router = express.Router();

const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') return null;
  return new GoogleGenerativeAI(key);
};

const GEMINI_MODEL = 'gemini-1.5-pro';

router.post('/', async (req, res) => {
  const { prompt, style, history = [] } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const genAI = getGenAI();
  if (!genAI) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const systemPrompt = buildWebsiteGenSystemPrompt(style);

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 8192
      }
    });

    const chatHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content }]
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(`Build this web app: ${prompt}`);
    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);
  } catch (err) {
    console.error('generateWebsite error:', err.message);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Gemini returned malformed JSON. Try again.' });
    }
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
