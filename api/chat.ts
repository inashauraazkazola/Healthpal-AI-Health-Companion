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

const DISCLAIMER = '> This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.';

/**
 * Extract clean user-facing response from AI output.
 *
 * Strategy: Qwen3 tends to leak its reasoning before the actual answer.
 * The actual answer always starts with the disclaimer blockquote line.
 * So we find that line and take everything from there onwards.
 * If the disclaimer is missing entirely, we strip known junk and prepend it.
 */
function extractCleanResponse(text: string): string {
  // 1. Remove <think>...</think> blocks (Qwen3 thinking tags)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 2. Try to find the disclaimer line and take everything from there
  const disclaimerPattern = /^>\s*This AI analysis is informative/m;
  const match = cleaned.match(disclaimerPattern);

  if (match && match.index !== undefined) {
    // Take everything from the disclaimer onwards — discard ALL preceding text
    cleaned = cleaned.substring(match.index);
  } else {
    // Disclaimer not found — aggressively strip all reasoning junk
    cleaned = cleaned
      .replace(/^(Analyze the Request|Formulate the Response|Review against constraints|Greeting Content|Drafting content|Disclaimer|English only\?|Concise\?|Safe\/|Data\/metrics|No internal)[:\s].*$/gim, '')
      .replace(/^(N\/A|Yes[.,]|No[.,]).*/gim, '')
      .replace(/^[-*]\s*(Act as|Give general|ALWAYS include|Focus on|DO NOT|If Hands|Language:).*/gim, '')
      .replace(/^(User manages|Recent conversation|Persona|Rules):?.*/gim, '')
      .replace(/^(Acknowledge|Be warm|Use Markdown|Keep it).*/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Prepend disclaimer if it's missing
    if (!disclaimerPattern.test(cleaned)) {
      cleaned = DISCLAIMER + '\n\n' + cleaned;
    }
  }

  // 3. Final cleanup: collapse blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Text-only chat via qwen3p7-plus (thinking disabled).
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
