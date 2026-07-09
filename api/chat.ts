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
 * Extract ONLY the clean user-facing response from Qwen3 output.
 * Uses a double-pass slicing algorithm to find where the actual greeting/answer
 * starts (e.g. "Welcome to HealthPal", "Hello", "Hi", or "##") and prepends the disclaimer.
 */
function extractCleanResponse(text: string): string {
  // Step 0: Remove <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Step 1: Look for response block section markers
  const sectionMarkers = [
    /Draft the Content:/i,
    /Drafting content:/i,
    /Drafting:/i,
    /Greeting\/Wellness insight:/i,
    /Greeting\/Content:/i,
    /Greeting:/i,
    /Content:/i
  ];

  let bestMarkerIdx = -1;
  let matchedMarkerLength = 0;

  for (const marker of sectionMarkers) {
    const matches = [...cleaned.matchAll(new RegExp(marker, 'gi'))];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      if (lastMatch.index !== undefined && lastMatch.index > bestMarkerIdx) {
        bestMarkerIdx = lastMatch.index;
        matchedMarkerLength = lastMatch[0].length;
      }
    }
  }

  let sliceText = cleaned;
  if (bestMarkerIdx !== -1) {
    sliceText = cleaned.substring(bestMarkerIdx + matchedMarkerLength);
  }

  // Step 2: In the slice text, find the first occurrence of the greeting keywords or heading
  const greetingPatterns = [
    /##/i,
    /welcome to healthpal/i,
    /hello/i,
    /hi[!\s,]/i,
    /hey[!\s,]/i
  ];

  let bestGreetingIdx = -1;
  for (const pattern of greetingPatterns) {
    const match = sliceText.match(pattern);
    if (match && match.index !== undefined) {
      if (bestGreetingIdx === -1 || match.index < bestGreetingIdx) {
        bestGreetingIdx = match.index;
      }
    }
  }

  if (bestGreetingIdx !== -1) {
    cleaned = sliceText.substring(bestGreetingIdx);
  } else {
    // Fallback: If no section markers or greetings found in the slice, search the whole text from the end
    const fallbackPatterns = [
      /welcome to healthpal/i,
      /hello[!\s,]/i,
      /hi[!\s,]/i,
      /##/
    ];
    let lastGreetingIdx = -1;
    for (const pattern of fallbackPatterns) {
      const matches = [...cleaned.matchAll(new RegExp(pattern, 'gi'))];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        if (lastMatch.index !== undefined && lastMatch.index > lastGreetingIdx) {
          lastGreetingIdx = lastMatch.index;
        }
      }
    }
    if (lastGreetingIdx !== -1) {
      cleaned = cleaned.substring(lastGreetingIdx);
    }
  }

  // Remove any duplicate or existing disclaimers in the main body
  cleaned = cleaned.replace(/^>\s*This AI analysis is informative[^\n]*\n*/gm, '').trim();
  cleaned = cleaned.replace(/^This AI analysis is informative[^\n]*\n*/gm, '').trim();

  // Clean trailing review check blocks, trailing standalone numbers (like "4."), and leftover asterisks
  cleaned = cleaned
    .replace(/\n*\s*Review against constraints:[\s\S]*/i, '')
    .replace(/\*\*+$/, '')
    .replace(/\n+\s*\d+\.?\s*$/, '') // remove trailing standalone numbers like "4."
    .replace(/\n+\s*[-*+]\s*$/, '')   // remove trailing bullet symbols
    .trim();

  // Prepend the mandatory Medical Disclaimer
  cleaned = DISCLAIMER + '\n\n' + cleaned;

  // Final cleanup of blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

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
