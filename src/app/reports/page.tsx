'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/NavBar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { toast } from '@/components/Toaster';

interface Row {
  id: string; title: string;
  period_start: string | null; period_end: string | null;
  provider: string | null; model: string | null;
  status: string; starred: boolean;
  rows_total: number;
  summary_preview: string;
  kpis_count: number; insights_count: number;
  created_at: number;
}

export default function ReportsPage() {
  const [rows,   setRows]   = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [delId,  setDelId]  = useState<string | null>(null);
  const [query,  setQuery]  = useState('');

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const d = await fetch('/api/reports?limit=200').then((r) => r.json()).catch(() => ({ reports: [] }));
    setRows(d.reports || []); setLoaded(true);
  }
  async function confirmDelete() {
    if (!delId) return;
    await fetch(`/api/reports/${delId}`, { method: 'DELETE' });
    setDelId(null); refresh(); toast('success', 'Report removed');
  }
  async function star(id: string, val: boolean) {
    await fetch(`/api/reports/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ starred: val }),
    });
    refresh();
  }

  const filtered = rows.filter((r) => !query || `${r.title} ${r.summary_preview}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell header={{ action: <Link href="/upload" className="btn btn-primary">+ New</Link> }}>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label-eyebrow mb-2">Library</div>
          <h1 className="heading-hero">Reports.</h1>
          <p className="lede mt-3 max-w-2xl">
            Every briefing the almanac has written, ready to re-open, print, or hand to a client.
          </p>
        </div>
        <input className="input" style={{ width: 260 }} placeholder="search reports…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <section className="plate">
        {!loaded ? (
          <div className="py-12 text-center text-ink-3"><span className="spinner" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="font-display text-[20px]" style={{ color: 'var(--ink-2)' }}>
              {rows.length === 0 ? 'No reports yet.' : 'No matches for that search.'}
            </div>
            {rows.length === 0 && (
              <Link href="/upload" className="btn btn-ghost mt-4">Drop your first CSV →</Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((r) => (
              <li key={r.id} className="px-5 py-4 flex items-start gap-3 hover:bg-paperSoft transition-colors">
                <button onClick={() => star(r.id, !r.starred)} className="text-lg leading-none mt-1" title="Star">
                  <span style={{ color: r.starred ? 'var(--gold)' : 'var(--ink-4)' }}>{r.starred ? '★' : '☆'}</span>
                </button>
                <Link href={`/reports/${r.id}`} className="grow min-w-0">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="font-display font-semibold text-[17px]" style={{ color: 'var(--ink-1)' }}>{r.title}</div>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {r.period_start || '—'} → {r.period_end || '—'}
                    </span>
                  </div>
                  {r.summary_preview && <p className="text-[12.5px] italic mt-1 line-clamp-2" style={{ color: 'var(--ink-2)' }}>{r.summary_preview}</p>}
                  <div className="mt-2 flex gap-2 text-[10.5px] font-mono uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                    <span>{r.rows_total.toLocaleString()} rows</span>
                    <span style={{ color: 'var(--navy)' }}>· {r.kpis_count} KPIs</span>
                    <span style={{ color: 'var(--gold)' }}>· {r.insights_count} insights</span>
                    <span className="ml-auto">{r.provider} · {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
                <button className="btn btn-danger btn-sm" onClick={() => setDelId(r.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal open={!!delId}
        title="Delete this report?"
        message="The full plan + all insights + KPIs are removed. The original CSV files on your disk are untouched."
        confirmText="Delete" destructive
        onCancel={() => setDelId(null)} onConfirm={confirmDelete} />
    </AppShell>
  );
}
