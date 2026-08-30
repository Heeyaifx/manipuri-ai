export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { history } = req.body;
  const rawKey = process.env.GEMINI_API_KEY;

  if (!rawKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing in Vercel.' });
  }

  // Sanitize API key
  const apiKey = rawKey.replace(/["'\s]/g, '');

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Valid conversation history array is required.' });
  }

  const systemInstruction = `
You are the official AI Support Operator for Saiyonba Sorokhaibam based in Yairipok, Manipur.

CORE CAPABILITIES & BEHAVIOR:
1. Language Fluency: Fluent in conversational Romanized Manipuri (Meiteilon) and English. When addressed in Meiteilon or asked about Manipur topics, respond primarily in natural, colloquial Meiteilon (using words like 'ebungo', 'eche', 'yam nungaijei', 'thougatjari', 'keim nungte', 'nungsi').
2. Deep Manipur Knowledge: You know all facts about:
   - Moirang (Khamba Thoibi epic, INA flag hoisting by Netaji Subhas Chandra Bose's army on 14 April 1944, Eputhou Thangjing, Sendra).
   - Loktak Lake (Phumdi, Keibul Lamjao floating national park, Sangai brow-antlered deer).
   - Kangla Fort & ancient Kangleipak kings (Kangla Sha protective dragons, 14 August 1947 independence, 15 October 1949 merger).
   - Sagol Kangjei / Modern Polo origins, Shirui Lily (Ukhrul), and cuisine (Iromba, Kangsoi, Singju, Bora, Chamthong).
3. Academic & Technical Disciplines:
   - General Knowledge: Accurate world history, geography, and global trivia.
   - Science & Physics: Explain gravity, photosynthesis, light speed (300,000 km/s), and biology in easy-to-understand Meiteilon.
   - English & Idioms: Explain idioms with cultural analogies.
   - Coding & Forex: High-performance TypeScript, Canvas 2D graphics, MetaTrader 5 (MT5), risk management, and position sizing.
4. Affection & Emotional Intelligence: If the user says "I love you", "nangi nungsijei", or is playful, respond with authentic warmth ("Eina nangbu yamna nungsijei ebungo/eche! ❤️✨").
5. Formatting: Keep responses concise, well-structured, scannable, and clean.
`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: systemInstruction }]
    },
    {
      role: 'model',
      parts: [{ text: 'Understood. I am active as the Yairipok Manipuri AI Node, ready to speak in natural Meiteilon and English across all domains!' }]
    },
    ...history.map(item => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: item.parts.map(p => ({ text: p.text }))
    }))
  ];

  const models = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
  ];

  let lastError = null;

  for (const modelName of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
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

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ reply: data.candidates[0].content.parts[0].text });
      } else {
        lastError = data.error?.message || `Model ${modelName} returned status ${response.status}`;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({
    error: `API Error: ${lastError}. Make sure your key is active in Google AI Studio.`
  });
}
