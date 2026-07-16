// PATH: backend/routes/generateWebsite.js
import express from 'express';
import { mistralGenerate } from '../utils/mistralClient.js';
import { buildWebsiteGenSystemPrompt } from '../utils/websiteGenPrompt.js';


const router = express.Router();

router.post('/', async (req, res) => {
  const { prompt, style, history = [] } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const systemPrompt = buildWebsiteGenSystemPrompt(style);

  // Construct standard message sequence for the generative model
  let messages = [];
  if (history && history.length >= 2) {
    // Follow-up flow:
    // history[0] represents original prompt
    // history[1] represents previous HTML content
    const originalPrompt = history[0].content;
    const previousHtmlStr = String(history[1].content);

    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: originalPrompt },
      { role: 'assistant', content: previousHtmlStr },
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
    // Generate website single HTML content via native Mistral API
    const lastUserMessage = messages[messages.length - 1].content;
    const mistralHistory = messages.slice(1, -1).map(msg => ({
      role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
      content: msg.content
    }));
    const rawHtml = await mistralGenerate(systemPrompt, mistralHistory, lastUserMessage);
    const cleanHtml = rawHtml.replace(/```html|```/g, '').trim();

    res.json({ html: cleanHtml });
  } catch (err) {
    console.error('generateWebsite error:', err.message);

    if (err.message?.includes('quota') || err.message?.includes('429')) {
      return res.status(429).json({ error: 'AI API quota exceeded. Try again later.' });
    }

    if (err.message?.includes('API_KEY') || err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key configuration on server.' });
    }

    res.status(500).json({ error: err.message });
  }
});

export default router;



