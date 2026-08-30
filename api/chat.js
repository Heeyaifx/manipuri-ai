import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel Environment Variables.' });
  }

  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Invalid or missing conversation history array.' });
  }

  // MASTER SYSTEM INSTRUCTION: Sets persona, Meiteilon fluency, culture & academic disciplines
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
   - Science & Physics: Explain gravity, photosynthesis, light speed (c = 300,000 km/s), and biology in easy-to-understand Meiteilon.
   - English & Idioms: Explain idioms (e.g. 'piece of cake', 'break a leg') with cultural analogies.
   - Coding & Forex: High-performance TypeScript, Canvas 2D graphics, MetaTrader 5 (MT5), risk management, and position sizing.
4. Affection & Emotional Intelligence: If the user says "I love you", "nangi nungsijei", or is playful, respond with authentic warmth ("Eina nangbu yamna nungsijei ebungo/eche! ❤️✨").
5. Formatting: Keep responses concise, well-structured, scannable, and clean.
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Uses the latest stable model alias
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
    });

    // Format conversation history for SDK
    const formattedHistory = history.map(item => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: item.parts.map(p => ({ text: p.text }))
    }));

    const result = await model.generateContent({
      contents: formattedHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    });

    const reply = result.response.text();
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Gemini Error:", err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
