/* GET /api/reports — recent reports (most-recent first). */

import { NextResponse } from 'next/server';
import { listReports } from '@/lib/db';

export async function GET(req: Request) {
  const url   = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 200);
  return NextResponse.json({
    reports: listReports(limit).map((r) => ({
      id: r.id, title: r.title,
      period_start: r.period_start, period_end: r.period_end,
      provider: r.provider, model: r.model,
      status: r.status, starred: !!r.starred,
      rows_total: r.rows_total,
      summary_preview: r.summary ? r.summary.slice(0, 240) : '',
      kpis_count: countOf(r.kpis_json),
      insights_count: countOf(r.insights_json),
      created_at: r.created_at, generated_at: r.generated_at,
    })),
  });
}
function countOf(s: string | null): number {
  if (!s) return 0;
  try { const a = JSON.parse(s); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
}
