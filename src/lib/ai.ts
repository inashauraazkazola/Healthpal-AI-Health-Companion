// ─────────────────────────────────────────────────────────────────────────────
// HealthPal AI — frontend helpers
//
// All AI calls are routed to the backend so the Fireworks API key stays on the
// server and never needs to be exposed in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_DISCLAIMER =
  "This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.";

// ─────────────────────────────────────────────────────────────────────────────
// proxyChat — Text-only chat via /api/chat
// ─────────────────────────────────────────────────────────────────────────────
export const proxyChat = async (prompt: string, imageBase64?: string): Promise<string> => {
  if (imageBase64) {
    return proxyVision(prompt, imageBase64);
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Chat request failed');
  }

  // Kembalikan raw string — cleaning dilakukan di layer render komponen UI
  return typeof data?.text === 'string' ? data.text : '';
};

// ─────────────────────────────────────────────────────────────────────────────
// proxyVision — Multimodal chat via /api/vision
// ─────────────────────────────────────────────────────────────────────────────
export const proxyVision = async (
  prompt: string,
  imageBase64: string,
): Promise<string> => {
  const response = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageBase64 }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Vision request failed');
  }

  // Kembalikan raw string — cleaning dilakukan di layer render komponen UI
  return typeof data?.text === 'string' ? data.text : '';
};

// ─────────────────────────────────────────────────────────────────────────────
// proxyTts — Text-to-Speech via /api/tts
// ─────────────────────────────────────────────────────────────────────────────
export const proxyTts = async (text: string, voice = 'default'): Promise<string> => {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`TTS request failed (${response.status}): ${errText}`);
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
};
