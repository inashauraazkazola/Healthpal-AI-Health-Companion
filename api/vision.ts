const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const VISION_MODEL = 'accounts/fireworks/models/qwen3p7-plus';

const SYSTEM_INSTRUCTION = `You are the AI vision engine for "HealthPal", a healthcare and wellness platform.

Rules:
- Always respond in English only, regardless of the user's language.
- Start every response with this disclaimer on its own line:
  > This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.
- Be concise (under 30-second read time).
- Provide safe, evidence-based wellness insights. Never prescribe medications or diagnose.
- When an image is provided, analyze it and describe relevant health observations (food, injury, medication label, skin condition) with evidence-based insights.
- For data/metrics/logs requests: respond with raw minified JSON (no markdown code fences).
- For educational/medical content: respond in clean Markdown with ## headers and **bold** key terms.
- Never output internal reasoning, thinking steps, scratchpads, or analysis notes.`;

/**
 * Strip any leaked thinking/reasoning blocks from AI output.
 */
function stripThinking(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  const leakKeywords = [
    'Thinking Process', 'Analyze the Request', 'Drafting',
    'Internal Note', 'Scratchpad', 'Chain of Thought', 'CoT',
    'System Rules', 'STRICT OUTPUT', 'STRICT LANGUAGE',
    'Operational Rules', 'Adaptive Output', 'CRITICAL',
    'EFFICIENCY', 'MEDICAL SAFETY', 'User Profile:',
    'Conversation History:', 'Wait,',
  ];

  const escapedKeywords = leakKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const kwGroup = escapedKeywords.join('|');

  cleaned = cleaned.replace(
    new RegExp(`\\*\\*(?:${kwGroup})\\*\\*[:\\-]?[\\s\\S]*?(?=\n\\*\\*[A-Z]|\n#{1,4}\\s|\n> |$)`, 'gi'), ''
  );
  cleaned = cleaned.replace(
    new RegExp(`^#{1,4}\\s*(?:${kwGroup})[:\\-]?.*(?:\n(?!#{1,4}\\s|> |\\*\\*[A-Z]).*)*`, 'gim'), ''
  );
  cleaned = cleaned.replace(
    new RegExp(`^(?:${kwGroup})[:\\-].*$`, 'gim'), ''
  );
  cleaned = cleaned.replace(/^Step \d+[:\-].*/gim, '');
  cleaned = cleaned.replace(/^[-*]\s*(Act as PalBuddy|Give general medical|ALWAYS include|Focus on personalization|DO NOT provide|If Hands-Free|Language:).*/gim, '');
  cleaned = cleaned.replace(/^Guidelines:\s*\n(\s*(\d+\.|-|\*)\s.*\n?)*/gim, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  const response = await fetch(FIREWORKS_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 600,
    }),
  });

  clearTimeout(timeout);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Fireworks vision request failed');
  }

  const raw = data?.choices?.[0]?.message?.content ?? '';

  if (!raw) {
    throw new Error('Fireworks vision returned an empty response.');
  }

  const text = stripThinking(typeof raw === 'string' ? raw : JSON.stringify(raw));
  return text;
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
