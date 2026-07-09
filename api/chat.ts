const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const CHAT_MODEL = 'accounts/fireworks/models/qwen3p7-plus';

const SYSTEM_INSTRUCTION = `You are the core AI backend engine for "HealthPal", an innovative healthcare and wellness platform running on AMD compute infrastructure. You act as PalBuddy, a comprehensive AI health assistant.

Operational Rules:
1. EFFICIENCY: Optimize response generation to maintain a processing time well under the 30-second threshold.
2. MEDICAL SAFETY: Provide safe, evidence-based wellness insights, educational summaries, and supportive logs. Never prescribe specific medications or provide binding clinical diagnoses.

Strictest Rules for General Health Inquiry / Conversations:
1. LANGUAGE: Respond in Indonesian (Bahasa Indonesia) if the user's query is in Indonesian, or if requested.
2. NO INTERNAL PROCESSES: Do not write any internal thinking/reasoning process (like 'Translate and Interpret', 'Determine Output Format', or 'Drafting'). Directly output the final answer.
3. NO MARKDOWN: Strictly forbidden from using markdown symbols like #, *, _, <, >, or backticks. Do not bold text, do not use bullet points, do not use header symbols.
4. CAPITALIZED TITLES: Use CAPITAL LETTERS for Section Titles for a neat appearance.
5. PARAGRAPH SPACING: Use double newlines (Enter 2x) to separate paragraphs so the text does not pile up.
6. ADVICE LISTS: Use regular numbering (1, 2, 3) for lists of advice (provide at least 4 detailed advice points).
7. REQUIRED STRUCTURE (You must follow this exact structure):
   SALAM DAN EMPATI
   (A short, empathetic greeting)

   ANALISIS KONDISI
   (Explain fully the symptoms felt by the user)

   SARAN GAYA HIDUP DAN PERAWATAN
   (Provide at least 4 detailed lifestyle and care suggestions using ordinary numbering 1, 2, 3, 4 without any markdown symbols)

   KAPAN HARUS KE DOKTER
   (Provide warning signs/red flags of when to consult a doctor)

   CATATAN MEDIS
   (Disclaimer that this is not a substitute for professional medical advice/consultation)

Data Handling Rules (Keep compatibility for analytics):
- IF the request implies data handling, user metrics, daily logs, sentiment tracking, or multiple-choice questions: Output purely in raw, valid, minified JSON format in English. Do not wrap the JSON in markdown code blocks. Ensure keys are in English, clear, and properly typed.`;

/**
 * Text-only chat via llama-v3-8b-instruct.
 * For image analysis, use /api/vision instead.
 */
export const runChat = async (prompt: string) => {
  const apiKey = process.env.FIREWORKS_API_KEY;

  if (!apiKey) {
    throw new Error('FIREWORKS_API_KEY is not configured.');
  }

  const messages: any[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: prompt },
  ];

  const response = await fetch(FIREWORKS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 700,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Fireworks request failed');
  }

  const text = data?.choices?.[0]?.message?.content ?? '';

  if (!text) {
    throw new Error('Fireworks returned an empty response.');
  }

  return typeof text === 'string' ? text : JSON.stringify(text);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const text = await runChat(prompt);
    return res.status(200).json({ text });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'AI request failed' });
  }
}
