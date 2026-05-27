/* POST /api/generate
 *
 * The single endpoint that turns 1-N uploaded CSV/TSV files into a saved
 * report. Body:
 *   { datasets: [{ kind, label, sample, rowsCount, dateRange, headers }],
 *     business_name?, language?, period_hint?, goal_hint?, provider? }
 *
 * The client-side parser (lib/parse.ts) does the heavy lifting; the
 * server only needs the trimmed `sample` field per dataset to build the
 * AI prompt. This keeps the request payload small and lets the user
 * preview what's being sent before they hit generate. */

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { decryptString } from '@/lib/crypto';
import { getDefaultProviderKey, insertReport } from '@/lib/db';
import { buildReportPrompt, coerceReportResult } from '@/lib/report';
import type { ParsedDataset } from '@/lib/parse';
import { chatJson, type ProviderId } from '@/lib/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const datasets = (Array.isArray(body.datasets) ? body.datasets : []).slice(0, 8) as ParsedDataset[];
  if (datasets.length === 0) {
    return NextResponse.json({ error: 'at least one dataset is required' }, { status: 400 });
  }
  /* Belt-and-braces: sanitise each dataset so we don't trust the client. */
  const clean: ParsedDataset[] = datasets.map((d) => ({
    kind:      ['instagram','whatsapp','pos','sheets','other'].includes(String(d.kind)) ? d.kind : 'other',
    label:     String(d.label || 'untitled').slice(0, 80),
    headers:   Array.isArray(d.headers) ? d.headers.slice(0, 60).map((h) => String(h).slice(0, 120)) : [],
    rows:      [],                                /* full rows aren't sent; sample is enough */
    rowsCount: Math.max(0, Math.min(1_000_000, Math.round(Number(d.rowsCount) || 0))),
    dateRange: d.dateRange && (d.dateRange as any).start ? d.dateRange : null,
    sample:    String(d.sample || '').slice(0, 16000),
  }));

  const providerId: ProviderId = ['openai','anthropic','gemini'].includes(String(body.provider))
    ? body.provider as ProviderId : pickProvider();
  const key = getDefaultProviderKey(providerId);
  if (!key) {
    return NextResponse.json({
      error: `no ${providerId} key configured — add one in Settings, or choose a different provider.`,
    }, { status: 412 });
  }

  const apiKey = decryptString(key.key_encrypted);
  const prompt = buildReportPrompt({
    business_name: body.business_name ? String(body.business_name).slice(0, 120) : undefined,
    language:      ['en','az','ru','tr'].includes(String(body.language)) ? body.language : 'en',
    datasets:      clean,
    period_hint:   body.period_hint ? String(body.period_hint).slice(0, 120) : undefined,
    goal_hint:     body.goal_hint   ? String(body.goal_hint).slice(0, 400)   : undefined,
  });

  try {
    const t0 = Date.now();
    const r  = await chatJson({
      provider: providerId, apiKey, model: key.model || undefined,
      system: prompt.system, user: prompt.user, maxTokens: 3800,
    });
    const out = coerceReportResult(r.data);

    const id = randomUUID();
    const totalRows = clean.reduce((s, d) => s + d.rowsCount, 0);
    insertReport({
      id,
      title:        out.title || (body.business_name ? `${body.business_name} · report` : 'Monthly report'),
      period_start: out.period.start,
      period_end:   out.period.end,
      sources_json: JSON.stringify(clean.map((d) => ({ kind: d.kind, label: d.label, rows_count: d.rowsCount, date_range: d.dateRange }))),
      summary:      out.summary,
      kpis_json:    JSON.stringify(out.kpis),
      insights_json: JSON.stringify(out.insights),
      categories_json: JSON.stringify(out.categories),
      patterns_json:   JSON.stringify(out.patterns),
      recommendations_json: JSON.stringify(out.recommendations),
      raw_text:     clean.map((d) => `=== ${d.label} (${d.kind}) ===\n${d.sample}`).join('\n\n').slice(0, 60000),
      rows_total:   totalRows,
      provider:     providerId,
      model:        r.model,
      status:       'ready',
      starred:      0,
      created_at:   Date.now(),
      generated_at: Date.now(),
    });

    return NextResponse.json({
      ok: true, id,
      result: out,
      meta: { provider: providerId, model: r.model, latency_ms: Date.now() - t0, rows_total: totalRows },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}

function pickProvider(): ProviderId {
  if (getDefaultProviderKey('openai'))    return 'openai';
  if (getDefaultProviderKey('anthropic')) return 'anthropic';
  return 'gemini';
}
