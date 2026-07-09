// ─────────────────────────────────────────────────────────────────────────────
// HealthPal AI — frontend helpers
//
// All AI calls are routed to the backend so the Fireworks API key stays on the
// server and never needs to be exposed in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_DISCLAIMER =
  "This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.";

// ─────────────────────────────────────────────────────────────────────────────
// cleanAiResponse — Universal frontend response cleanup
// Applied to EVERY AI response before it leaves this module.
// Strips leaked internal reasoning from the model (e.g. "* *Wait...").
// ─────────────────────────────────────────────────────────────────────────────
function cleanAiResponse(text: string): string {
  if (typeof text !== 'string' || !text) return text;

  let cleaned = text;

  // ── Potong di "* *" (bintang-spasi-bintang) — ini satu-satunya marker kebocoran AI yang valid ──
  // JANGAN potong di "**" karena itu markdown bold yang sah (mis. **heart failure**)
  if (cleaned.includes('* *')) {
    cleaned = cleaned.split('* *')[0];
  }

  // ── Potong jika ada 'Wait, check constraints' atau 'check constraints' ──
  const constraintIdx = cleaned.search(/Wait,?\s*check\s*constraints|check\s*constraints/i);
  if (constraintIdx !== -1) {
    cleaned = cleaned.substring(0, constraintIdx);
  }

  // ── Keyword cadangan ───────────────────────────────────────────────────────
  const trashMarkers = [
    '* Okay',
    '* Output',
    '* Note:',
    '*Note:',
    "##` headers",
  ];
  for (const marker of trashMarkers) {
    const idx = cleaned.indexOf(marker);
    if (idx !== -1) {
      cleaned = cleaned.substring(0, idx);
    }
  }

  // ── Bersihkan ekor bintang/spasi menggantung ──────────────────────────────
  cleaned = cleaned.trim().replace(/[\s\*]+$/, '');

  return cleaned;
}

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
