// PATH: backend/config/openRouter.js

export const generateResponse = async (prompt, model = "google/gemini-2.0-flash-exp:free") => {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: "system",
                    content: "You must return only valid raw JSON. No markdown. No explanation. No code blocks.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.2,
        }),
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error("OpenRouter API Error: " + error);
    }

    const data = await res.json();
    return data.choices[0].message.content;
};