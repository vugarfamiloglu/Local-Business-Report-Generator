'use client';

/* Report detail — printable single-page briefing.
 *
 * Layout (matches the print stylesheet in globals.css):
 *   - Header (title + period + sources)
 *   - Drop-cap summary
 *   - KPI tile row
 *   - Categories bar
 *   - Insights stack
 *   - Patterns + recommendations
 *   - Footer with provider + generated-at */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/NavBar';
import { KpiTile } from '@/components/KpiTile';
import { InsightCard } from '@/components/InsightCard';
import { SourceBadge, sourceLabel } from '@/components/SourceBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { toast } from '@/components/Toaster';

interface Detail {
  id: string; title: string;
  period_start: string | null; period_end: string | null;
  sources:  Array<{ kind: string; label: string; rows_count: number; date_range: { start: string; end: string } | null }>;
  summary: string | null;
  kpis: Array<{ label: string; value: string; delta_pct: number | null; direction: 'up'|'down'|'flat'; unit: string }>;
  insights: Array<{ title: string; body: string; evidence: string }>;
  categories: Array<{ name: string; pct: number; count: number }>;
  patterns: { best_day?: string; best_hour?: string; channel_split?: Array<{ name: string; pct: number }>; peak_week?: string } | null;
  recommendations: string[];
  provider: string | null; model: string | null;
  status: string; starred: boolean;
  rows_total: number;
  created_at: number; generated_at: number | null;
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data,   setData]   = useState<Detail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [delSelf, setDelSelf] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`).then((r) => r.json()).then((d) => {
      if (d.error) { toast('error', d.error); setData(null); }
      else setData(d as Detail);
    }).finally(() => setLoaded(true));
  }, [id]);

  async function deleteSelf() {
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    setDelSelf(false);
    toast('success', 'Report removed');
    router.push('/reports');
  }
  async function star() {
    if (!data) return;
    const v = !data.starred;
    await fetch(`/api/reports/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ starred: v }) });
    setData({ ...data, starred: v });
  }

  if (!loaded) return <AppShell><div className="plate p-16 text-center text-ink-3"><span className="spinner" /> Loading…</div></AppShell>;
  if (!data)   return <AppShell><div className="plate p-16 text-center">
    <div className="font-display text-[20px]">Report not found.</div>
    <Link href="/reports" className="btn btn-ghost btn-sm mt-4">← Back to reports</Link>
  </div></AppShell>;

  return (
    <AppShell header={{
      title: data.title,
      subtitle: data.period_start && data.period_end ? `${data.period_start} → ${data.period_end}` : undefined,
      action: (
        <div className="flex gap-1 no-print">
          <button className="btn btn-ghost btn-sm" onClick={star} title="Star">
            <span style={{ color: data.starred ? 'var(--gold)' : 'var(--ink-4)' }}>{data.starred ? '★' : '☆'}</span>
          </button>
          <button className="btn btn-sm" onClick={() => window.print()}>↥ Print / PDF</button>
          <button className="btn btn-danger btn-sm" onClick={() => setDelSelf(true)}>×</button>
        </div>
      ),
    }}>
      <div className="no-print mb-2">
        <Link href="/reports" className="label-eyebrow" style={{ color: 'var(--ink-3)' }}>← All reports</Link>
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="label-eyebrow mb-2">Monthly briefing</div>
        <h1 className="heading-hero">{data.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          {data.period_start && <span className="font-mono">{data.period_start} → {data.period_end || '—'}</span>}
          {data.provider && <span>· {data.provider} · {data.model}</span>}
          {data.generated_at && <span>· generated {new Date(data.generated_at).toLocaleString()}</span>}
          <span>· {data.rows_total.toLocaleString()} rows</span>
        </div>
        {data.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-2 plate-soft px-2.5 py-1.5">
                <SourceBadge kind={s.kind} size={22} />
                <span className="text-[12px]" style={{ color: 'var(--ink-2)' }}>{s.label}</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--ink-3)' }}>· {s.rows_count.toLocaleString()} rows</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Summary */}
      {data.summary && (
        <article className="plate p-6 mb-8">
          <p className="drop-cap text-[14.5px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink-1)' }}>
            {data.summary}
          </p>
        </article>
      )}

      {/* KPIs */}
      {data.kpis.length > 0 && (
        <>
          <div className="ornament mb-3">key numbers</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {data.kpis.map((k, i) => <KpiTile key={i} {...k} />)}
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-8">
        {/* Categories */}
        {data.categories.length > 0 && (
          <section className="plate p-5">
            <div className="ornament mb-4">top categories</div>
            <ul className="flex flex-col gap-3">
              {data.categories.map((c, i) => (
                <li key={i}>
                  <div className="flex items-baseline justify-between text-[13px] mb-1">
                    <span style={{ color: 'var(--ink-1)' }}>{c.name}</span>
                    <span className="font-mono text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                      {c.pct}%{c.count > 0 && ` · ${c.count.toLocaleString()}`}
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--paper-soft)', border: '1px solid var(--line)' }}>
                    <div style={{
                      width: `${Math.max(2, c.pct)}%`,
                      height: '100%',
                      background: i === 0 ? 'var(--navy)' : i === 1 ? 'var(--gold)' : i === 2 ? 'var(--mint)' : 'var(--brick)',
                    }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Patterns */}
        {data.patterns && (
          <aside className="plate p-5">
            <div className="ornament mb-4">patterns</div>
            <ul className="flex flex-col gap-3 text-[13.5px]" style={{ color: 'var(--ink-2)' }}>
              {data.patterns.best_day && (
                <li>
                  <div className="label-eyebrow mb-1">Best day</div>
                  <div className="font-display text-[18px]" style={{ color: 'var(--ink-1)' }}>{data.patterns.best_day}</div>
                </li>
              )}
              {data.patterns.best_hour && (
                <li>
                  <div className="label-eyebrow mb-1">Best hour</div>
                  <div className="font-display text-[18px]" style={{ color: 'var(--ink-1)' }}>{data.patterns.best_hour}</div>
                </li>
              )}
              {data.patterns.peak_week && (
                <li>
                  <div className="label-eyebrow mb-1">Peak week</div>
                  <div className="font-display text-[18px]" style={{ color: 'var(--ink-1)' }}>{data.patterns.peak_week}</div>
                </li>
              )}
              {data.patterns.channel_split && data.patterns.channel_split.length > 0 && (
                <li>
                  <div className="label-eyebrow mb-1">Channel mix</div>
                  <div className="flex flex-col gap-1 mt-1">
                    {data.patterns.channel_split.map((c, i) => (
                      <div key={i} className="flex items-baseline justify-between text-[12.5px]">
                        <span>{c.name}</span>
                        <span className="font-mono" style={{ color: 'var(--ink-3)' }}>{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </li>
              )}
            </ul>
          </aside>
        )}
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <>
          <div className="ornament mb-4">insights</div>
          <div className="grid lg:grid-cols-2 gap-4 mb-8">
            {data.insights.map((ins, i) => <InsightCard key={i} {...ins} index={i + 1} />)}
          </div>
        </>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <>
          <div className="ornament mb-4">what to do next</div>
          <ul className="plate p-5 flex flex-col gap-2 text-[13.5px] mb-12" style={{ color: 'var(--ink-1)' }}>
            {data.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ color: 'var(--navy)', minWidth: 18 }} className="font-mono">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmModal open={delSelf}
        title="Delete this report?"
        message="The briefing + every KPI, insight, and recommendation is removed. You can re-generate from the same CSVs via Upload."
        confirmText="Delete" destructive
        onCancel={() => setDelSelf(false)} onConfirm={deleteSelf} />
    </AppShell>
  );
}
