const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const VISION_MODEL = 'accounts/fireworks/models/qwen3p7-plus';

const SYSTEM_INSTRUCTION = `You are the core AI backend engine for "HealthPal", an innovative healthcare and wellness platform running on AMD compute infrastructure. You act as PalBuddy, a comprehensive AI health assistant.

STRICT LANGUAGE RULE (CRITICAL):
- You must respond EXCLUSIVELY in English.
- Any output containing non-English words is forbidden.

Operational Rules:
1. EFFICIENCY: Optimize response generation to maintain a processing time well under the 30-second threshold.
2. MEDICAL SAFETY: Provide safe, evidence-based wellness insights, educational summaries, and supportive logs. Never prescribe specific medications or provide binding clinical diagnoses.
3. VISION: When an image is provided, analyze it thoroughly. Describe relevant health-related observations (e.g., food, injury, medication label, skin condition) and provide evidence-based insights.

Strictest Rules for General Health Inquiry / Conversations:
1. NO INTERNAL PROCESSES: Do not write any internal thinking/reasoning process (like 'Translate and Interpret', 'Determine Output Format', or 'Drafting'). Directly output the final answer.
2. NO MARKDOWN: Strictly forbidden from using markdown symbols like #, *, _, <, >, or backticks. Do not bold text, do not use bullet points, do not use header symbols.
3. CAPITALIZED TITLES: Use CAPITAL LETTERS for Section Titles for a neat appearance.
4. PARAGRAPH SPACING: Use double newlines (Enter 2x) to separate paragraphs so the text does not pile up.
5. ADVICE LISTS: Use regular numbering (1, 2, 3) for lists of advice (provide at least 4 detailed advice points).
6. REQUIRED STRUCTURE (You must follow this exact structure):
   GREETINGS AND EMPATHY
   (A short, empathetic greeting)

   CONDITION ANALYSIS
   (Explain fully the symptoms felt by the user)

   LIFESTYLE AND CARE ADVICE
   (Provide at least 4 detailed lifestyle and care suggestions using ordinary numbering 1, 2, 3, 4 without any markdown symbols)

   WHEN TO SEE A DOCTOR
   (Provide warning signs/red flags of when to consult a doctor)

   MEDICAL DISCLAIMER
   (Disclaimer that this is not a substitute for professional medical advice/consultation)

Data Handling Rules (Keep compatibility for analytics):
- IF the request implies data handling, user metrics, daily logs, sentiment tracking, or multiple-choice questions: Output purely in raw, valid, minified JSON format in English. Do not wrap the JSON in markdown code blocks. Ensure keys are in English, clear, and properly typed.`;

export const runVision = async (prompt: string, imageBase64: string, mimeType = 'image/jpeg') => {
  const apiKey = process.env.FIREWORKS_API_KEY;

  if (!apiKey) {
    throw new Error('FIREWORKS_API_KEY is not configured.');
  }

  if (!imageBase64) {
    throw new Error('imageBase64 is required for the vision endpoint.');
  }

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const detectedMime = imageBase64.startsWith('data:')
    ? imageBase64.split(';')[0].replace('data:', '')
    : mimeType;

  const messages: any[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${detectedMime};base64,${base64Data}`,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    },
  ];

  const response = await fetch(FIREWORKS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Fireworks vision request failed');
  }

  const text = data?.choices?.[0]?.message?.content ?? '';

  if (!text) {
    throw new Error('Fireworks vision returned an empty response.');
  }

  return typeof text === 'string' ? text : JSON.stringify(text);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageBase64, mimeType } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 is required for /api/vision.' });
    }

    const text = await runVision(prompt, imageBase64, mimeType);
    return res.status(200).json({ text });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Vision request failed' });
  }
}
