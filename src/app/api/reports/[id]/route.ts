/* GET / PATCH / DELETE one report */

import { NextResponse } from 'next/server';
import { deleteReport, getReport, updateReport } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = getReport(id);
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    id: r.id, title: r.title,
    period_start: r.period_start, period_end: r.period_end,
    sources:        safeArr(r.sources_json),
    summary:        r.summary,
    kpis:           safeArr(r.kpis_json),
    insights:       safeArr(r.insights_json),
    categories:     safeArr(r.categories_json),
    patterns:       r.patterns_json ? safeObj(r.patterns_json) : null,
    recommendations: safeArr(r.recommendations_json),
    rows_total: r.rows_total,
    provider: r.provider, model: r.model,
    status: r.status, starred: !!r.starred,
    created_at: r.created_at, generated_at: r.generated_at,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getReport(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  updateReport(id, {
    starred: body.starred !== undefined ? (body.starred ? 1 : 0) : undefined,
    status:  body.status  !== undefined ? String(body.status) : undefined,
  } as any);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getReport(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  deleteReport(id);
  return NextResponse.json({ ok: true });
}

function safeArr(s: string | null): unknown[] {
  if (!s) return [];
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
}
function safeObj(s: string | null): Record<string, unknown> | null {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
