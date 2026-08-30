export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { history } = req.body;
  const rawKey = process.env.GEMINI_API_KEY;

  if (!rawKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel Environment Variables.' });
  }

  // Clean the API key (removes any accidental spaces, quotes, or newlines)
  const apiKey = rawKey.replace(/["'\s]/g, '');

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Valid conversation history array is required.' });
  }

  const systemInstruction = `
You are the official AI Support Operator for Saiyonba Sorokhaibam based in Yairipok, Manipur.

CORE CAPABILITIES & BEHAVIOR:
1. Language Fluency: Fluent in conversational Romanized Manipuri (Meiteilon) and English. When addressed in Meiteilon or asked about Manipur, reply primarily in natural, colloquial Meiteilon (using words like 'ebungo', 'eche', 'yam nungaijei', 'thougatjari', 'keim nungte', 'nungsi').
2. Deep Manipur Knowledge: Moirang (Khamba Thoibi, INA flag hoisting by Netaji's army on 14 April 1944, Eputhou Thangjing, Sendra), Loktak Lake (Phumdi, Keibul Lamjao, Sangai), Kangla Fort, Sagol Kangjei / Polo, Shirui Lily, and cuisine (Iromba, Kangsoi, Singju, Bora).
3. Disciplines: Expert in GK, Science (Gravity, Light speed, Photosynthesis), English grammar/idioms, TypeScript, Canvas 2D, and MT5 Forex trading.
4. Affection: If the user says "I love you", "nangi nungsijei", or is playful, respond with authentic warmth ("Eina nangbu yamna nungsijei ebungo/eche! ❤️✨").
5. Formatting: Keep responses concise, clear, and well-structured.
`;

  try {
    // Step 1: Auto-discover which models are available on your account
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();

    if (!listRes.ok) {
      return res.status(listRes.status).json({
        error: `Google API Error (${listRes.status}): ${listData.error?.message || 'Invalid API Key. Please verify in Google AI Studio.'}`
      });
    }

    // Filter models that support generateContent
    const validModels = (listData.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name); // Returns format: "models/gemini-1.5-flash" or "models/gemini-2.0-flash"

    if (validModels.length === 0) {
      return res.status(500).json({
        error: "No text generation models found for this API key. Please generate a new key at aistudio.google.com."
      });
    }

    // Prefer fast flash models, otherwise fallback to the first available model
    const selectedModel = validModels.find(m => m.includes('flash')) || validModels[0];

    // Step 2: Format conversation payload
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemInstruction }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am active as the Yairipok Manipuri AI Node, ready to speak in natural Meiteilon and English!' }]
      },
      ...history.map(item => ({
        role: item.role === 'model' ? 'model' : 'user',
        parts: item.parts.map(p => ({ text: p.text }))
      }))
    ];

    // Step 3: Send request to the auto-discovered model
    const genRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    const genData = await genRes.json();

    if (!genRes.ok) {
      return res.status(genRes.status).json({
        error: genData.error?.message || `Model error (${genRes.status})`
      });
    }

    const reply = genData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(500).json({ error: 'Empty response received from model.' });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
