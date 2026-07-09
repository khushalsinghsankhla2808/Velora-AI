// PATH: backend/utils/openRouterClient.js

export const openRouterClient = {
  chat: async ({ model, messages, response_format }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      throw new Error('OPENROUTER_API_KEY is not configured on the server.');
    }

    const body = {
      model: model || 'google/gemini-2.5-flash',
      messages,
    };

    if (response_format) {
      body.response_format = response_format;
    }

    const response = await globalThis.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://velora-builder.vercel.app',
        'X-Title': 'Velora AI'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter returned an empty response.');
    }

    return { content };
  }
};
