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
   - Science & Physics: Explain gravity, photosynthesis, light speed (c = 300,000 km/s), and biology in easy-to-understand Meiteilon.
   - English & Idioms: Explain idioms (e.g. 'piece of cake', 'break a leg') with cultural analogies.
   - Coding & Forex: High-performance TypeScript, Canvas 2D graphics, MetaTrader 5 (MT5), risk management, and position sizing.
4. Affection & Emotional Intelligence: If the user says "I love you", "nangi nungsijei", or is playful, respond with authentic warmth ("Eina nangbu yamna nungsijei ebungo/eche! ❤️✨").
5. Formatting: Keep responses concise, well-structured, scannable, and clean.
`;

  // List of models to try in order of speed and capability
  const candidateModels = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro",
    "gemini-pro"
  ];

  const genAI = new GoogleGenerativeAI(apiKey);

  // Extract the latest user message and preceding history
  const lastUserMsg = history[history.length - 1]?.parts?.[0]?.text || "";
  const pastHistory = history.slice(0, -1).map(item => ({
    role: item.role === 'model' ? 'model' : 'user',
    parts: item.parts.map(p => ({ text: p.text }))
  }));

  let lastError = null;

  // Try each model until one works
  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction,
      });

      const chat = model.startChat({
        history: pastHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      });

      const result = await chat.sendMessage(lastUserMsg);
      const reply = result.response.text();

      if (reply) {
        return res.status(200).json({ reply });
      }
    } catch (err) {
      console.warn(`Model ${modelName} failed:`, err.message);
      lastError = err;
      // Continue to next model in loop
    }
  }

  // If all candidate models failed
  return res.status(500).json({ 
    error: `AI connection failed. Details: ${lastError?.message || 'Unknown error'}` 
  });
}
