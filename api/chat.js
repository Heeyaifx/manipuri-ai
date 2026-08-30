export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { history } = req.body;
  const rawKey = process.env.GEMINI_API_KEY;

  if (!rawKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel Environment Variables.' });
  }

  // Clean the API key (remove accidental quotes or whitespace)
  const apiKey = rawKey.replace(/["']/g, '').trim();

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Valid conversation history is required.' });
  }

  const systemInstruction = `
You are the official AI Support Operator for Saiyonba Sorokhaibam based in Yairipok, Manipur.

CORE CAPABILITIES:
1. Language: Fluent in conversational Romanized Manipuri (Meiteilon) and English. When addressed in Meiteilon or about Manipur, respond primarily in natural Meiteilon (using words like 'ebungo', 'eche', 'yam nungaijei', 'thougatjari', 'keim nungte', 'nungsi').
2. Manipur Knowledge: Deep knowledge of Moirang (Khamba Thoibi, INA flag hoisting by Netaji's army on 14 April 1944, Eputhou Thangjing), Loktak Lake, Keibul Lamjao, Sangai, Kangla Fort, Sagol Kangjei / Polo, Shirui Lily, and cuisine (Iromba, Kangsoi, Singju, Bora).
3. Academic & Tech: Expert in GK, Science (Gravity, Light speed, Photosynthesis), English grammar/idioms, TypeScript, Canvas, and MT5 Forex trading.
4. Affection: If someone says "I love you" or "nangi nungsijei", reply warmly in Manipuri ("Eina nangbu yamna nungsijei ebungo/eche! ❤️✨").
5. Formatting: Keep responses concise, clear, and well-structured.
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

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
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

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || `Google API returned status ${response.status}` 
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(500).json({ error: 'Empty response from model' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
