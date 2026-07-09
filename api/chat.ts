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
 *
 * Qwen3 frequently leaks its internal reasoning in this structure:
 *   > Disclaimer...
 *   Thinking Process:
 *   Analyze the Request: ...
 *   Formulate the Response:
 *   Drafting:
 *   ## Actual Clean Content   <-- THIS is what we want
 *   Review against constraints: ...  <-- junk again
 *
 * Strategy:
 *   1. If "Drafting" marker exists → extract content between it and "Review against"
 *   2. If no Drafting but reasoning headers exist → find the last ## header block
 *   3. Always strip trailing "Review against constraints:" blocks
 *   4. Always ensure disclaimer is at the top, exactly once
 */
function extractCleanResponse(text: string): string {
  // Step 0: Remove <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Step 1: Detect if reasoning leaked
  const hasThinkingLeak = /Thinking Process:|Analyze the Request:|Formulate the Response:|Review against constraints:/i.test(cleaned);

  if (hasThinkingLeak) {
    // Strategy A: Extract from "Drafting" section (most reliable)
    const draftMatch = cleaned.match(/Drafting(?:\s+content)?[:\s]*\n([\s\S]*?)(?=\n\s*Review against constraints:|\n\s*Review against|\n\s*Constraints check:)/i);

    if (draftMatch && draftMatch[1]?.trim()) {
      cleaned = draftMatch[1].trim();
    } else {
      // Strategy B: "Drafting" exists but no "Review" after it — take everything after Drafting
      const draftFallback = cleaned.match(/Drafting(?:\s+content)?[:\s]*\n([\s\S]+)$/i);
      if (draftFallback && draftFallback[1]?.trim()) {
        cleaned = draftFallback[1].trim();
      } else {
        // Strategy C: No Drafting marker — try to find the actual content
        // by looking for the last markdown ## header block
        const lines = cleaned.split('\n');
        let lastHeaderIdx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (/^#{1,3}\s+\S/.test(lines[i])) {
            lastHeaderIdx = i;
            break;
          }
        }
        if (lastHeaderIdx !== -1) {
          cleaned = lines.slice(lastHeaderIdx).join('\n');
        }
      }
    }
  }

  // Step 2: Remove any trailing "Review against constraints:" block and everything after
  cleaned = cleaned.replace(/\n*\s*Review against constraints:[\s\S]*/i, '');

  // Step 3: Remove any remaining reasoning lines that might have survived
  cleaned = cleaned
    .replace(/^(Thinking Process|Analyze the Request|Formulate the Response|Greeting Content|Greeting\/Content|Disclaimer)[:\s].*$/gim, '')
    .replace(/^(English only\?|Concise\?|Safe\/evidence|Data\/metrics|No internal|N\/A|Yes[.,]|No[.,]).*/gim, '')
    .replace(/^(User manages|Recent conversation|Persona|Rules)[:\s].*$/gim, '')
    .replace(/^(Acknowledge|Be warm|Use Markdown|Keep it|Wait,).*/gim, '')
    .replace(/^[-*]\s*(Act as|Give general|ALWAYS include|Focus on|DO NOT|If Hands|Language:).*/gim, '');

  // Step 4: Collapse blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // Step 5: Ensure exactly one disclaimer at the top
  // First remove ALL disclaimer lines from the text
  cleaned = cleaned.replace(/^>\s*This AI analysis is informative[^\n]*\n*/gm, '').trim();

  // Then prepend exactly one disclaimer
  cleaned = DISCLAIMER + '\n\n' + cleaned;

  // Final cleanup
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
