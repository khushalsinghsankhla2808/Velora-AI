// PATH: backend/routes/generateWebsite.js
import express from 'express';
import { geminiJSON } from '../utils/geminiClient.js';
import { openRouterClient } from '../utils/openRouterClient.js';
import { buildWebsiteGenSystemPrompt } from '../utils/websiteGenPrompt.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { prompt, model, style, history = [], mode } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const systemPrompt = buildWebsiteGenSystemPrompt(style);

  // Construct standard message sequence for the generative model
  let messages = [];
  if (history && history.length >= 2) {
    // Follow-up flow:
    // history[0] represents original prompt
    // history[1] represents previous files JSON
    const originalPrompt = history[0].content;
    const previousFilesStr = typeof history[1].content === 'object'
      ? JSON.stringify(history[1].content)
      : String(history[1].content);

    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: originalPrompt },
      { role: 'assistant', content: previousFilesStr },
      { role: 'user', content: `Now: ${prompt}` }
    ];
  } else {
    // Initial generation flow
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Build this web app: ${prompt}` }
    ];
  }

  try {
    let parsed;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey && apiKey !== 'your_openrouter_api_key_here' && apiKey !== 'mock_openrouter_api_key') {
      const response = await openRouterClient.chat({
        model: model || 'google/gemini-2.5-flash',
        messages,
        response_format: { type: 'json_object' }
      });
      const clean = response.content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } else {
      // Fallback to native Gemini API
      // Since geminiJSON takes systemPrompt, userMessage, history, let's adapt it:
      const lastUserMessage = messages[messages.length - 1].content;
      const geminiHistory = messages.slice(1, -1).map(msg => ({
        role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
      parsed = await geminiJSON(systemPrompt, lastUserMessage, geminiHistory);
    }

    res.json(parsed);
  } catch (err) {
    console.error('generateWebsite error:', err.message);

    if (err.message?.includes('quota') || err.message?.includes('429')) {
      return res.status(429).json({ error: 'AI API quota exceeded. Try again later.' });
    }

    if (err.message?.includes('API_KEY') || err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key configuration on server.' });
    }

    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI returned malformed JSON. Try again.' });
    }

    res.status(500).json({ error: err.message });
  }
});

export default router;

