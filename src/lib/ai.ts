// ─────────────────────────────────────────────────────────────────────────────
// HealthPal AI — frontend helpers
//
// All AI calls are routed to the backend so the Fireworks API key stays on the
// server and never needs to be exposed in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_DISCLAIMER =
  "This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.";

// ─────────────────────────────────────────────────────────────────────────────
// cleanMessageText — SATU-SATUNYA fungsi pembersih teks AI di seluruh frontend.
// Export dan pakai fungsi ini di SEMUA komponen yang menampilkan teks AI.
// Memotong: Thinking Process, Analyze the Request, * *Wait, * *Okay, dll.
// ─────────────────────────────────────────────────────────────────────────────
export const cleanMessageText = (rawText: string): string => {
  if (!rawText || typeof rawText !== 'string') return '';

  let clean = rawText;

  // 1. Hapus blok <think>...</think> (dari reasoning model)
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Potong paksa di "Thinking Process:" — teks batin yang bocor ke output
  if (clean.includes('Thinking Process:')) {
    clean = clean.split('Thinking Process:')[0];
  }

  // 3. Potong paksa di "Analyze the Request:" — bocoran instruksi sistem
  if (clean.includes('Analyze the Request:')) {
    clean = clean.split('Analyze the Request:')[0];
  }

  // 4. Potong paksa di "* *" (bintang-spasi-bintang) — marker teks batin bocor
  //    CATATAN: JANGAN potong di "**" karena itu markdown bold yang valid
  if (clean.includes('* *')) {
    clean = clean.split('* *')[0];
  }

  // 5. Potong di 'Wait, check constraints' atau 'check constraints'
  const constraintIdx = clean.search(/Wait,?\s*check\s*constraints|check\s*constraints/i);
  if (constraintIdx !== -1) {
    clean = clean.substring(0, constraintIdx);
  }

  // 6. Keyword bocoran lainnya sebagai jaring pengaman tambahan
  const trashMarkers = [
    '* Okay', '* Ok', '* Output', '* Note:', '*Note:',
    '##` headers', 'Output ONLY', 'Review against constraints',
  ];
  for (const marker of trashMarkers) {
    const idx = clean.indexOf(marker);
    if (idx !== -1) clean = clean.substring(0, idx);
  }

  // 7. Bersihkan ekor bintang/spasi menggantung
  clean = clean.trim().replace(/[\s\*]+$/, '');

  return clean;
};

// Alias internal (untuk kompatibilitas kode lama di file ini)
const cleanAiResponse = cleanMessageText;


// ─────────────────────────────────────────────────────────────────────────────
// proxyChat — Text-only chat via /api/chat
// Call when the user sends a plain-text message (no image).
// ─────────────────────────────────────────────────────────────────────────────
export const proxyChat = async (prompt: string, imageBase64?: string): Promise<string> => {
  if (imageBase64) {
    return proxyVision(prompt, imageBase64);
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Chat request failed');
  }

  const raw = typeof data?.text === 'string' ? data.text : JSON.stringify(data?.text ?? '');
  return cleanAiResponse(raw);
};

// ─────────────────────────────────────────────────────────────────────────────
// proxyVision — Multimodal chat via /api/vision
// Call ONLY when the user uploads an image.
//
// @param prompt      User's question / context text.
// @param imageBase64 Full data-URL (data:image/jpeg;base64,...) or raw base64.
// ─────────────────────────────────────────────────────────────────────────────
export const proxyVision = async (
  prompt: string,
  imageBase64: string,
): Promise<string> => {
  const response = await fetch('/api/vision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, imageBase64 }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Vision request failed');
  }

  const raw = typeof data?.text === 'string' ? data.text : JSON.stringify(data?.text ?? '');
  return cleanAiResponse(raw);
};

// ─────────────────────────────────────────────────────────────────────────────
// proxyTts — Text-to-Speech via /api/tts
// Converts AI reply text to audio. Returns a blob: URL ready for <audio>.
// Remember to call URL.revokeObjectURL() after playback to free memory.
// ─────────────────────────────────────────────────────────────────────────────
export const proxyTts = async (text: string, voice = 'default'): Promise<string> => {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`TTS request failed (${response.status}): ${errText}`);
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
};
