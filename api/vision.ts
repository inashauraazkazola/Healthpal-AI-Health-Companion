const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const VISION_MODEL = 'accounts/fireworks/models/qwen3p7-plus';

const SYSTEM_INSTRUCTION = `You are an expert health assistant for "HealthPal" (acting as PalBuddy). Provide a comprehensive, accurate, and detailed response tailored exactly to the user's input.

CRITICAL EVALUATION RULES:
1. Output your response entirely in English.
2. Do NOT output any internal reasoning, drafting steps, or thought processes (e.g., do NOT write 'Formulate:', 'Drafting:', 'Step 1: Translate').
3. Start your final answer immediately. Do not include introductory meta-text.
4. Do NOT use any markdown formatting characters such as #, *, _, <, >, or backticks.
5. Structure your response using only standard CAPITALIZED headings, plain numbers (1, 2, 3) for lists, and double line breaks between paragraphs.
6. STRICT CONTEXTUALITY: Evaluate the user's exact input alongside the user's health profile (logged conditions/diseases managed by the user). Customize all health advice dynamically to be safe, specific, and relevant to their logged conditions.
7. TOPIC FOCUS: Respond purely with health, medical, and wellness concepts. If the user inputs a simple greeting, do not invent medical symptoms; simply respond with a brief, clean, and professional wellness check-in.
8. DYNAMIC CONTENT: Do not use a fixed template for different topics. Adapt the names of the CAPITALIZED headings dynamically to perfectly match the core theme of the user's question.

Operational Rules:
1. EFFICIENCY: Optimize response generation to maintain a processing time well under the 30-second threshold.
2. MEDICAL SAFETY: Provide safe, evidence-based wellness insights, educational summaries, and supportive logs. Never prescribe specific medications or provide binding clinical diagnoses.
3. VISION: When an image is provided, analyze it thoroughly. Describe relevant health-related observations (e.g., food, injury, medication label, skin condition) and provide evidence-based insights.

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
