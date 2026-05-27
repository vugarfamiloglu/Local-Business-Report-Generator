import type { ChatJsonRequest, ChatJsonResult } from './index';
import { DEFAULT_MODELS } from './index';

export async function chatGemini(req: ChatJsonRequest): Promise<ChatJsonResult> {
  const model = req.model || DEFAULT_MODELS.gemini;
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(req.apiKey)}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.3,
        maxOutputTokens: req.maxTokens ?? 3500,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 400)}`);
  }
  const j   = await res.json();
  const raw = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim();
  return { data: JSON.parse(raw), model, raw };
}
