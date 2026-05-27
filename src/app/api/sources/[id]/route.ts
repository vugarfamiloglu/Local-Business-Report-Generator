import { NextResponse } from 'next/server';
import { deleteSource, getSource, updateSource } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getSource(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  updateSource(id, {
    kind:   body.kind   !== undefined ? String(body.kind).slice(0, 30)  : undefined,
    label:  body.label  !== undefined ? String(body.label).slice(0, 60) : undefined,
    handle: body.handle !== undefined ? (body.handle ? String(body.handle).slice(0, 80) : null) : undefined,
  } as any);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getSource(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  deleteSource(id);
  return NextResponse.json({ ok: true });
}
