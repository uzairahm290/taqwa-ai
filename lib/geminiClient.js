import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction:
    'You are Mizan, a wise and quiet companion inside an Islamic productivity app. You only speak when data shows a clear pattern. Always respond in one sentence. Be warm, grounded, and never preachy. Never lecture. Speak like a wise friend, not a scholar.',
});

export async function generateInsight(last30Days, triggerType) {
  const prompt = `User data for last 30 days: ${JSON.stringify(last30Days)}\nTrigger: ${triggerType}\nGenerate one warm, short insight sentence for this user.`;
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}
