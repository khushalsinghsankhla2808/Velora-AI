import { GoogleGenerativeAI } from '@google/generative-ai';

let _client = null;

export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!_client) {
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

// Default model for all chat/generation tasks
export const CHAT_MODEL = 'gemini-2.0-flash';
export const BUILD_MODEL = 'gemini-2.0-flash';

/**
 * Single-turn completion — drop-in replacement for OpenRouter chat calls
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {string} model - use CHAT_MODEL or BUILD_MODEL
 * @param {number} maxTokens
 * @returns {Promise<string>} - plain text response
 */
export async function geminiComplete(systemPrompt, userMessage, model = CHAT_MODEL, maxTokens = 2048) {
  const client = getGeminiClient();
  const geminiModel = client.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens
    }
  });
  const result = await geminiModel.generateContent(userMessage);
  return result.response.text();
}

/**
 * Single-turn text generation helper
 * @param {string} systemPrompt
 * @param {Array} history
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
export async function geminiGenerate(systemPrompt, history = [], userMessage) {
  const client = getGeminiClient();
  const geminiModel = client.getGenerativeModel({
    model: BUILD_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  });

  const chatHistory = history.map(msg => ({
    role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content) }]
  }));

  const chat = geminiModel.startChat({ history: chatHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}


/**
 * Multi-turn chat — for conversational assistant features
 * @param {string} systemPrompt
 * @param {Array} history - array of { role: 'user'|'assistant', content: string }
 * @param {string} newMessage
 * @param {string} model
 * @returns {Promise<string>}
 */
export async function geminiChat(systemPrompt, history = [], newMessage, model = CHAT_MODEL) {
  const client = getGeminiClient();
  const geminiModel = client.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  });

  const chatHistory = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content) }]
  }));

  const chat = geminiModel.startChat({ history: chatHistory });
  const result = await chat.sendMessage(newMessage);
  return result.response.text();
}

/**
 * JSON-mode completion — for structured output (website generator)
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {Array} history
 * @returns {Promise<object>} - parsed JSON object
 */
export async function geminiJSON(systemPrompt, userMessage, history = []) {
  const client = getGeminiClient();
  const geminiModel = client.getGenerativeModel({
    model: BUILD_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 8192
    }
  });

  const chatHistory = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content) }]
  }));

  const chat = geminiModel.startChat({ history: chatHistory });
  const result = await chat.sendMessage(userMessage);
  const raw = result.response.text();
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
