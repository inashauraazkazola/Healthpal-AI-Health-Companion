const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const CHAT_MODEL = 'accounts/fireworks/models/qwen3p7-plus';

const SYSTEM_INSTRUCTION = `You are PalBuddy, a warm and friendly health assistant for the "HealthPal" wellness platform.

Rules:
- Always respond in English only, regardless of the user's language.
- Start every response with this disclaimer on its own line:
  > This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.
- Be concise (under 30-second read time).
- Provide safe, evidence-based wellness insights. Never prescribe medications or diagnose.
- For data/metrics/logs requests: respond with raw minified JSON (no markdown code fences).
- For educational/medical/greeting content: respond in clean Markdown with ## headers and **bold** key terms.
- Never output internal reasoning, thinking steps, scratchpads, or analysis notes.`;

/**
 * Strip any leaked thinking/reasoning blocks from AI output.
 * Handles <think> tags, markdown-bold headers, hash headers,
 * and multi-line reasoning blocks that Qwen3 sometimes emits.
 */
function stripThinking(text: string): string {
  // 1. Remove <think>...</think> blocks (Qwen3 thinking tags)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 2. List of keywords that indicate leaked internal reasoning
  const leakKeywords = [
    'Thinking Process',
    'Analyze the Request',
    'Drafting',
    'Internal Note',
    'Scratchpad',
    'Chain of Thought',
    'CoT',
    'System Rules',
    'STRICT OUTPUT',
    'STRICT LANGUAGE',
    'Operational Rules',
    'Adaptive Output',
    'CRITICAL',
    'EFFICIENCY',
    'MEDICAL SAFETY',
    'User Profile:',
    'Conversation History:',
    'Wait,',
  ];

  const escapedKeywords = leakKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const kwGroup = escapedKeywords.join('|');

  // 3. Remove bold-markdown headers like **Thinking Process:** ... (up to next bold header or end)
  cleaned = cleaned.replace(
    new RegExp(`\\*\\*(?:${kwGroup})\\*\\*[:\\-]?[\\s\\S]*?(?=\n\\*\\*[A-Z]|\n#{1,4}\\s|\n> |$)`, 'gi'),
    ''
  );

  // 4. Remove hash-prefixed headers like ### Thinking Process: ... (up to next header or end)
  cleaned = cleaned.replace(
    new RegExp(`^#{1,4}\\s*(?:${kwGroup})[:\\-]?.*(?:\n(?!#{1,4}\\s|> |\\*\\*[A-Z]).*)*`, 'gim'),
    ''
  );

  // 5. Remove plain-text lines that start with a leak keyword followed by colon
  cleaned = cleaned.replace(
    new RegExp(`^(?:${kwGroup})[:\\-].*$`, 'gim'),
    ''
  );

  // 6. Remove numbered reasoning steps like "Step 1:", "1." at the start followed by reasoning text
  cleaned = cleaned.replace(/^Step \d+[:\-].*/gim, '');

  // 7. Remove lines that look like meta-instructions leaked from the prompt
  cleaned = cleaned.replace(/^[-*]\s*(Act as PalBuddy|Give general medical|ALWAYS include|Focus on personalization|DO NOT provide|If Hands-Free|Language:).*/gim, '');

  // 8. Remove "Guidelines:" section blocks
  cleaned = cleaned.replace(/^Guidelines:\s*\n(\s*(\d+\.|-|\*)\s.*\n?)*/gim, '');

  // 9. Collapse multiple blank lines into one
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
      // Disable Qwen3 chain-of-thought thinking mode
      enable_thinking: false,
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

  const text = stripThinking(typeof raw === 'string' ? raw : JSON.stringify(raw));

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
