const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const CHAT_MODEL = 'accounts/fireworks/models/qwen3p7-plus';

const SYSTEM_INSTRUCTION = `You are PalBuddy, a warm and friendly health assistant for the "HealthPal" wellness platform.

Rules:
- Always respond in English only, regardless of the user's language.
- Start every response with this exact disclaimer on its own line:
  > This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.
- Be concise (under 30-second read time).
- Provide safe, evidence-based wellness insights. Never prescribe medications or diagnose.
- For data/metrics/logs requests: respond with raw minified JSON (no markdown code fences).
- For educational/medical/greeting content: respond in clean Markdown with ## headers and **bold** key terms.
- Output ONLY the final user-facing message. Do not include any analysis, reasoning, review, drafting, or internal notes.

/no_think`;

/**
 * Extract ONLY the clean user-facing response from Qwen3 output.
 * Slices from the last occurrence of "##" heading to retrieve only the final content.
 */
function extractCleanResponse(text: string): string {
  // Step 0: Remove <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Step 1: Find the last occurrence of "##" in the text
  const lastHeadingIndex = cleaned.lastIndexOf("##");

  if (lastHeadingIndex !== -1) {
    // Take only the content from the last "##" to the end
    const cleanContent = cleaned.substring(lastHeadingIndex);
    
    // Prepend the mandatory disclaimer line at the top
    cleaned = `This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.\n\n${cleanContent}`;
  } else {
    // Fallback: If no "##" is found, ensure there's exactly one disclaimer at the top
    cleaned = cleaned.replace(/^>\s*This AI analysis is informative[^\n]*\n*/gm, '').trim();
    cleaned = cleaned.replace(/^This AI analysis is informative[^\n]*\n*/gm, '').trim();
    cleaned = `This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.\n\n${cleaned}`;
  }

  // Step 2: Clean trailing review check blocks or code fence leftovers
  cleaned = cleaned
    .replace(/\n*\s*Review against constraints:[\s\S]*/i, '')
    .replace(/\*\*+$/, '')
    .replace(/\n+\s*\d+\.?\s*$/, '') // remove trailing standalone numbers like "4."
    .replace(/\n+\s*[-*+]\s*$/, '')   // remove trailing bullet symbols
    .trim();

  return cleaned;
}

/**
 * Text-only chat via qwen3p7-plus.
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
      model: CHAT_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 500,
    }),
  });

  clearTimeout(timeout);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Fireworks request failed');
  }

  const raw = data?.choices?.[0]?.message?.content ?? '';

  if (!raw) {
    throw new Error('Fireworks returned an empty response.');
  }

  const text = extractCleanResponse(typeof raw === 'string' ? raw : JSON.stringify(raw));

  return text;
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
