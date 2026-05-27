import type { ChatJsonRequest, ChatJsonResult } from './index';
import { DEFAULT_MODELS } from './index';

export async function chatAnthropic(req: ChatJsonRequest): Promise<ChatJsonResult> {
  const model = req.model || DEFAULT_MODELS.anthropic;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         req.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 3500,
      temperature: 0.3,
      system: `${req.system}\n\nIMPORTANT: respond with a single JSON object only. No prose, no fences.`,
      messages: [{ role: 'user', content: req.user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 400)}`);
  }
  const j   = await res.json();
  const raw = (j.content || []).map((b: any) => b.text || '').join('').trim();
  return { data: JSON.parse(stripFences(raw)), model, raw };
}
function stripFences(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const first = s.indexOf('{'); const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) return s.slice(first, last + 1);
  return s;
}
