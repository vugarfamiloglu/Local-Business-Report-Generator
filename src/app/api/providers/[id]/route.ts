import { NextResponse } from 'next/server';
import { deleteProviderKey, getProviderKey, setDefaultProviderKey } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProviderKey(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (body.is_default === true) setDefaultProviderKey(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getProviderKey(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  deleteProviderKey(id);
  return NextResponse.json({ ok: true });
}
