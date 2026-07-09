const FIREWORKS_TTS_URL = 'https://api.fireworks.ai/inference/v1/audio/speech';
const TTS_MODEL = 'accounts/fireworks/models/f5-tts';

export const runTts = async (text: string, voice = 'default') => {
  const apiKey = process.env.FIREWORKS_API_KEY;

  if (!apiKey) {
    throw new Error('FIREWORKS_API_KEY is not configured.');
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text is required for TTS.');
  }

  // Truncate extremely long texts to avoid TTS timeout (max ~1000 chars for smooth synthesis)
  const MAX_CHARS = 1000;
  const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '...' : text;

  // Strip markdown symbols to get clean plain text for TTS
  const plainText = truncated
    .replace(/#{1,6}\s/g, '')         // headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1')     // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/>\s/g, '')              // blockquotes
    .replace(/[-*+]\s/g, '')         // list items
    .trim();

  const response = await fetch(FIREWORKS_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: plainText,
      voice,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Fireworks TTS request failed (${response.status}): ${errText}`);
  }

  // Return the raw audio buffer
  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required for /api/tts.' });
    }

    const audioBuffer = await runTts(text, voice);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    return res.status(200).end(audioBuffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'TTS request failed' });
  }
}
