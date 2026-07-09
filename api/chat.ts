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

function extractCleanResponse(text: string): string {
  // Step 0: Remove <think>...</think> blocks
  let rawText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 1. Bersihkan duplikasi teks disclaimer bawaan di bagian atas jika ada
  rawText = rawText.replace(/^(This AI analysis is informative and does not replace professional medical consultation\. Please consult a licensed medical professional\.\s*)+/gi, '');
  rawText = rawText.replace(/^(>\s*This AI analysis is informative and does not replace professional medical consultation\. Please consult a licensed medical professional\.\s*)+/gi, '');

  // 2. Cari di mana letak teks batin atau instruksi internal terakhir berakhir.
  // Kita cari tanda "##" paling terakhir di dalam dokumen.
  const finalOutputIndex = rawText.lastIndexOf("##");

  if (finalOutputIndex !== -1) {
    // Potong total! Ambil HANYA jawaban akhir dari tanda ## tersebut ke bawah
    rawText = rawText.substring(finalOutputIndex);
  } else {
    // Jika tidak ada ##, cari baris baru terakhir yang mengandung teks sapaan/kesimpulan (fallback)
    const lines = rawText.split('\n');
    const cleanLines = lines.filter(line => 
      !line.includes("Analyze") && 
      !line.includes("Drafting") && 
      !line.includes("Output ONLY") && 
      !line.includes("flag is present") &&
      !line.match(/^\s*[\*\d\.-]\s*$/)
    );
    rawText = cleanLines.join('\n').trim();
  }

  // 3. Bersihkan kebocoran di bagian ekor/bawah teks
  // Jika mendeteksi tanda "* *Wait" atau "* *Okey" atau "* Output", potong dan buang semua teks di bawahnya
  const trashKeywords = ["* *Wait", "* *Okay", "* *Ok", "* Output", "##` headers"];
  for (const keyword of trashKeywords) {
    const trashIndex = rawText.indexOf(keyword);
    if (trashIndex !== -1) {
      rawText = rawText.substring(0, trashIndex); // Ambil hanya teks SEBELUM kata sampah tersebut
    }
  }

  // 4. Pastikan teks berformat rapi dan ditutup dengan benar
  rawText = rawText.trim();

  // 5. Pastikan Disclaimer Medis tetap berada di baris paling atas secara konsisten
  if (!rawText.startsWith("This AI analysis is informative")) {
    rawText = `This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.\n\n${rawText}`;
  }

  // 6. Clean trailing review check blocks or code fence leftovers
  rawText = rawText
    .replace(/\n*\s*Review against constraints:[\s\S]*/i, '')
    .replace(/\*\*+$/, '')
    .replace(/\n+\s*\d+\.?\s*$/, '') // remove trailing standalone numbers like "4."
    .replace(/\n+\s*[-*+]\s*$/, '')   // remove trailing bullet symbols
    .trim();

  return rawText;
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
