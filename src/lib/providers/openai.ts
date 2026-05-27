import type { ChatJsonRequest, ChatJsonResult } from './index';
import { DEFAULT_MODELS } from './index';

export async function chatOpenAi(req: ChatJsonRequest): Promise<ChatJsonResult> {
  const model = req.model || DEFAULT_MODELS.openai;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'authorization': `Bearer ${req.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: req.maxTokens ?? 3500,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user',   content: req.user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 400)}`);
  }
  const j   = await res.json();
  const raw = j.choices?.[0]?.message?.content || '';
  return { data: JSON.parse(raw), model, raw };
}
