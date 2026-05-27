/* GET + POST /api/sources  — label your data sources (Instagram, WhatsApp, …) */

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { insertSource, listSources } from '@/lib/db';

const KINDS = new Set(['instagram', 'whatsapp', 'pos', 'sheets', 'other']);

export async function GET() {
  return NextResponse.json({ sources: listSources() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kind  = String(body.kind  || 'other').toLowerCase();
  const label = String(body.label || '').trim().slice(0, 60);
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'unknown kind' }, { status: 400 });
  if (!label)           return NextResponse.json({ error: 'label is required' }, { status: 400 });
  const id = randomUUID();
  insertSource({
    id, kind, label,
    handle: body.handle ? String(body.handle).slice(0, 80) : null,
    created_at: Date.now(),
  });
  return NextResponse.json({ ok: true, id });
}
