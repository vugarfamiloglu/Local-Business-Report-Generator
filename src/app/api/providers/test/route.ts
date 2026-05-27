import { NextResponse } from 'next/server';
import { decryptString } from '@/lib/crypto';
import { getProviderKey } from '@/lib/db';
import { chatJson, type ProviderId } from '@/lib/providers';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const row = getProviderKey(String(body.id || ''));
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const apiKey = decryptString(row.key_encrypted);
  try {
    const t0 = Date.now();
    const r  = await chatJson({
      provider: row.provider as ProviderId,
      apiKey, model: row.model || undefined,
      system: 'Return exactly {"pong": true}.',
      user:   'ping',
      maxTokens: 60,
    });
    const ok = (r.data as any)?.pong === true;
    return NextResponse.json({ ok, model: r.model, latency_ms: Date.now() - t0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 502 });
  }
}
