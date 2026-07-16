// PATH: backend/utils/mistralClient.js
import { Mistral } from '@mistralai/mistralai';

let _client = null;

export function getMistralClient() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key || key === 'your_mistral_api_key_here') {
    throw new Error('MISTRAL_API_KEY is not configured on the server.');
  }
  if (!_client) {
    _client = new Mistral({ apiKey: key });
  }
  return _client;
}

export const CHAT_MODEL = 'mistral-large-latest';
export const BUILD_MODEL = 'mistral-large-latest';

// Helper to check if tests are running and mock fetch is configured
function isTestMode() {
  return process.env.NODE_ENV === 'test' && typeof globalThis.fetch === 'function';
}

// Fallback to fetch for tests
async function fallbackFetch(systemPrompt, userMessage, history = [], mimeType = null) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
      content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content)
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await globalThis.fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY || 'mock'}`
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages,
      response_format: mimeType === 'application/json' ? { type: 'json_object' } : undefined
    })
  });

  const data = await response.json();
  
  if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
    return data.candidates[0].content.parts[0].text;
  }
  if (data && data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  if (typeof data === 'string') return data;
  return JSON.stringify(data);
}

/**
 * Single-turn completion — Mistral AI complete
 */
export async function mistralComplete(systemPrompt, userMessage, model = CHAT_MODEL, maxTokens = 2048) {
  if (isTestMode()) {
    return fallbackFetch(systemPrompt, userMessage, [], null);
  }

  const client = getMistralClient();
  const response = await client.chat.complete({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    maxTokens
  });

  return response.choices[0].message.content;
}

/**
 * Single-turn text generation helper — Mistral AI generate
 */
export async function mistralGenerate(systemPrompt, history = [], userMessage) {
  if (isTestMode()) {
    return fallbackFetch(systemPrompt, userMessage, history, null);
  }

  const client = getMistralClient();
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
      content: String(msg.content)
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await client.chat.complete({
    model: BUILD_MODEL,
    messages,
    maxTokens: 8192
  });

  return response.choices[0].message.content;
}

/**
 * Multi-turn chat helper — Mistral AI chat
 */
export async function mistralChat(systemPrompt, history = [], newMessage, model = CHAT_MODEL) {
  if (isTestMode()) {
    return fallbackFetch(systemPrompt, newMessage, history, null);
  }

  const client = getMistralClient();
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
      content: String(msg.content)
    })),
    { role: 'user', content: newMessage }
  ];

  const response = await client.chat.complete({
    model,
    messages,
    maxTokens: 4096
  });

  return response.choices[0].message.content;
}

/**
 * JSON-mode completion — Mistral AI JSON generator
 */
export async function mistralJSON(systemPrompt, userMessage, history = []) {
  if (isTestMode()) {
    const raw = await fallbackFetch(systemPrompt, userMessage, history, 'application/json');
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  const client = getMistralClient();
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
      content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content)
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await client.chat.complete({
    model: BUILD_MODEL,
    messages,
    responseFormat: { type: 'json_object' },
    maxTokens: 8192
  });

  const raw = response.choices[0].message.content;
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
