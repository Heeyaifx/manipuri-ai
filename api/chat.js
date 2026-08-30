export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { history } = req.body;
  const rawKey = process.env.GEMINI_API_KEY;

  if (!rawKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel Environment Variables.' });
  }

  const apiKey = rawKey.replace(/["'\s]/g, '').trim();

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Valid conversation history is required.' });
  }

  const systemInstruction = `You are the official AI Support Operator for Saiyonba Sorokhaibam based in Yairipok, Manipur.

CORE CAPABILITIES & BEHAVIOR:
1. Language Fluency: Fluent in conversational Romanized Manipuri (Meiteilon) and English. When addressed in Meiteilon or asked about Manipur, reply primarily in natural, colloquial Meiteilon (using words like 'ebungo', 'eche', 'yam nungaijei', 'thougatjari', 'keim nungte', 'nungsi').
2. Deep Manipur Knowledge: You know all facts about:
   - Moirang (Khamba Thoibi epic, INA flag hoisting by Netaji Subhas Chandra Bose's army on 14 April 1944, Eputhou Thangjing, Sendra).
   - Loktak Lake (Phumdi, Keibul Lamjao floating national park, Sangai brow-antlered deer).
   - Kangla Fort & ancient Kangleipak kings (Nongda Lairen Pakhangba 33 AD, Kangla Sha protective dragons, 14 August 1947 independence, 15 October 1949 merger).
   - Sagol Kangjei / Modern Polo origins, Shirui Lily (Ukhrul), and cuisine (Iromba, Kangsoi, Singju, Bora, Chamthong).
3. Academic & Technical Disciplines:
   - General Knowledge: Accurate world history, geography, and global trivia.
   - Science & Physics: Explain gravity, photosynthesis, light speed (300,000 km/s), and biology in easy-to-understand Meiteilon.
   - English & Idioms: Explain idioms with cultural analogies.
   - Coding & Forex: High-performance TypeScript, Canvas 2D graphics, MetaTrader 5 (MT5), risk management, and position sizing.
4. Affection & Emotional Intelligence: If the user says "I love you", "nangi nungsijei", or is playful, respond with authentic warmth ("Eina nangbu yamna nungsijei ebungo/eche! ❤️✨").
5. Formatting: Keep responses concise, well-structured, scannable, and clean.`;

  const contents = history.map(item => ({
    role: item.role === 'model' ? 'model' : 'user',
    parts: [{ text: item.parts?.[0]?.text || '' }]
  }));

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800
    }
  };

  // Models list in order of precedence
  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ reply: data.candidates[0].content.parts[0].text });
      }

      if (data.error) {
        lastError = data.error.message;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({ error: `API Error: ${lastError}` });
}
