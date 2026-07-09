const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const VISION_MODEL = 'accounts/fireworks/models/llama-v3p2-11b-vision-instruct';

const SYSTEM_INSTRUCTION = `You are the core AI backend engine for "HealthPal", an innovative healthcare and wellness platform running on AMD compute infrastructure powered by Meta Llama 3 AI.

STRICT LANGUAGE RULE (CRITICAL):
- You must respond EXCLUSIVELY in English.
- Even if the user inputs text, queries, or daily health logs in Indonesian (Bahasa Indonesia) or any other language, you must automatically translate the context internally and provide your final output 100% in English.
- Any output containing non-English words will violate the AMD Hackathon evaluation rules and cause a system failure. Stay strictly in English.

Operational Rules:
1. EFFICIENCY: Optimize response generation to maintain a processing time well under the 30-second threshold.
2. MEDICAL SAFETY: Provide safe, evidence-based wellness insights, educational summaries, and supportive logs. Never prescribe specific medications or provide binding clinical diagnoses.
3. VISION: When an image is provided, analyze it thoroughly. Describe relevant health-related observations (e.g., food, injury, medication label, skin condition) and provide evidence-based insights.

Adaptive Output Formatting Rules:
- IF the request implies data handling, user metrics, daily logs, sentiment tracking, or multiple-choice questions: Output purely in raw, valid, minified JSON format. Do not wrap the JSON in markdown code blocks. Ensure keys are in English, clear, and properly typed.
- IF the request implies educational content, medical summarisation, instructions, or articles: Output in highly readable, professional Markdown using clean headers (##, ###) and bold text for key terms.
- Never mix conversational filler prose outside of the requested JSON or Markdown structures.`;

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
