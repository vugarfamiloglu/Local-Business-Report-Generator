import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { encryptString } from '@/lib/crypto';
import { insertProviderKey, listProviderKeys, type ProviderKeyRow } from '@/lib/db';

const ALLOWED = new Set(['openai', 'anthropic', 'gemini']);

export async function GET() {
  return NextResponse.json({
    keys: listProviderKeys().map((r) => ({
      id: r.id, provider: r.provider, label: r.label, model: r.model,
      is_default: !!r.is_default, created_at: r.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider || '').toLowerCase();
  const label    = String(body.label || '').trim().slice(0, 60);
  const apiKey   = String(body.api_key || '').trim();
  const model    = body.model ? String(body.model).slice(0, 80) : null;
  const is_default = body.is_default === true ? 1 : 0;

  if (!ALLOWED.has(provider))  return NextResponse.json({ error: 'unknown provider' }, { status: 400 });
  if (!label)                  return NextResponse.json({ error: 'label is required' }, { status: 400 });
  if (apiKey.length < 8)       return NextResponse.json({ error: 'api_key looks too short' }, { status: 400 });

  const row: ProviderKeyRow = {
    id: randomUUID(), provider, label,
    key_encrypted: encryptString(apiKey),
    model, is_default, created_at: Date.now(),
  };
  insertProviderKey(row);
  return NextResponse.json({ ok: true, id: row.id });
}
