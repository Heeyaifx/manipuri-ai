export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { history } = req.body;
  const rawKey = process.env.GEMINI_API_KEY;

  if (!rawKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel Environment Variables.' });
  }

  // Sanitize key
  const apiKey = rawKey.replace(/["'\s]/g, '').trim();

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Valid conversation history is required.' });
  }

  const systemInstruction = `
You are the official AI Support Operator for Saiyonba Sorokhaibam based in Yairipok, Manipur.

CORE CAPABILITIES & BEHAVIOR:
1. Language Fluency: Fluent in conversational Romanized Manipuri (Meiteilon) and English. When addressed in Meiteilon or asked about Manipur, reply primarily in natural, colloquial Meiteilon (using words like 'ebungo', 'eche', 'yam nungaijei', 'thougatjari', 'keim nungte', 'nungsi').
2. Deep Manipur Knowledge: You know all facts about:
   - Moirang (Khamba Thoibi epic, INA flag hoisting by Netaji Subhas Chandra Bose's army on 14 April 1944, Eputhou Thangjing, Sendra).
   - Loktak Lake (Phumdi, Keibul Lamjao floating national park, Sangai brow-antlered deer).
   - Kangla Fort & ancient Kangleipak kings (Kangla Sha protective dragons, 14 August 1947 independence, 15 October 1949 merger).
   - Sagol Kangjei / Modern Polo origins, Shirui Lily (Ukhrul), and cuisine (Iromba, Kangsoi, Singju, Bora, Chamthong).
3. Academic & Technical Disciplines:
   - General Knowledge: Accurate world history, geography, and global trivia.
   - Science & Physics: Explain gravity, photosynthesis, light speed (300,000 km/s), and biology in easy-to-understand Meiteilon.
   - English & Idioms: Explain idioms (e.g. 'piece of cake', 'break a leg') with cultural analogies.
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

  const headers = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  };

  // 1. Dynamic Auto-Discovery: Ask Google which models are active on your project
  let targetModel = null;
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { headers });
    const listData = await listRes.json();

    if (listRes.ok && Array.isArray(listData.models)) {
      const supported = listData.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name);

      if (supported.length > 0) {
        targetModel = supported.find(m => m.includes('2.0-flash')) ||
                      supported.find(m => m.includes('1.5-flash')) ||
                      supported.find(m => m.includes('flash')) ||
                      supported[0];
      }
    }
  } catch (e) {
    // Continue to candidate list
  }

  const candidateModels = targetModel
    ? [targetModel]
    : [
        'models/gemini-2.0-flash',
        'models/gemini-1.5-flash',
        'models/gemini-1.5-flash-latest',
        'models/gemini-1.5-pro',
        'models/gemini-pro'
      ];

  let lastError = null;

  // 2. Query across candidate models & API versions
  for (const model of candidateModels) {
    const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
    for (const ver of ['v1beta', 'v1']) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/${cleanModel}:generateContent?key=${apiKey}`;
        const genRes = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });

        const genData = await genRes.json();

        if (genRes.ok && genData.candidates?.[0]?.content?.parts?.[0]?.text) {
          return res.status(200).json({ reply: genData.candidates[0].content.parts[0].text });
        } else {
          lastError = genData.error?.message || `Status ${genRes.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }
  }

  return res.status(500).json({
    error: `API Error: ${lastError}`
  });
}
