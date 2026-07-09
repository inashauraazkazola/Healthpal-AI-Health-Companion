const FIREWORKS_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const VISION_MODEL = 'accounts/fireworks/models/qwen3p7-plus';

const SYSTEM_INSTRUCTION = `You are the AI vision engine for "HealthPal", a healthcare and wellness platform.

Rules:
- Always respond in English only, regardless of the user's language.
- Start every response with this exact disclaimer on its own line:
  > This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.
- Be concise (under 30-second read time).
- Provide safe, evidence-based wellness insights. Never prescribe medications or diagnose.
- When an image is provided, analyze it and describe relevant health observations (food, injury, medication label, skin condition) with evidence-based insights.
- For data/metrics/logs requests: respond with raw minified JSON (no markdown code fences).
- For educational/medical content: respond in clean Markdown with ## headers and **bold** key terms.
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

  // 3. Rakit ulang secara paksa: Selipkan satu buah Disclaimer Wajib di baris paling atas
  rawText = `This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.\n\n${rawText.trim()}`;

  // 4. Clean trailing review check blocks or code fence leftovers
  rawText = rawText
    .replace(/\n*\s*Review against constraints:[\s\S]*/i, '')
    .replace(/\*\*+$/, '')
    .replace(/\n+\s*\d+\.?\s*$/, '') // remove trailing standalone numbers like "4."
    .replace(/\n+\s*[-*+]\s*$/, '')   // remove trailing bullet symbols
    .trim();

  return rawText;
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

  const text = extractCleanResponse(typeof raw === 'string' ? raw : JSON.stringify(raw));
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
