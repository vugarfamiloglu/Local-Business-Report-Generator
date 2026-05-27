'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/NavBar';
import { SourceBadge, sourceLabel } from '@/components/SourceBadge';

interface ReportRow {
  id: string; title: string;
  period_start: string | null; period_end: string | null;
  status: string; rows_total: number;
  summary_preview: string;
  kpis_count: number; insights_count: number;
  created_at: number;
}

export default function DashboardPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/reports?limit=20').then((r) => r.json()).then((d) => {
      setRows(d.reports || []); setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const totalReports = rows.length;
  const totalRows    = rows.reduce((s, r) => s + r.rows_total, 0);
  const totalKpis    = rows.reduce((s, r) => s + r.kpis_count, 0);
  const totalInsights = rows.reduce((s, r) => s + r.insights_count, 0);

  return (
    <AppShell header={{
      action: <Link href="/upload" className="btn btn-primary">↥ New report</Link>,
    }}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="label-eyebrow mb-2">Mission control</div>
          <h1 className="heading-hero">Dashboard.</h1>
          <p className="lede mt-3 max-w-2xl">
            Every report Tally has written, the rows behind them, and the next
            briefing waiting for a CSV. Drop a file from your DMs, WhatsApp,
            register, or sheets and the model writes the rest.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="kpi-tile"><div className="label">Reports</div><div className="value">{totalReports}</div><div className="delta flat"><span>·</span><span>on file</span></div></div>
        <div className="kpi-tile"><div className="label">Rows analysed</div><div className="value" style={{ color: 'var(--navy)' }}>{totalRows.toLocaleString()}</div><div className="delta flat"><span>·</span><span>across all reports</span></div></div>
        <div className="kpi-tile"><div className="label">KPIs drawn</div><div className="value" style={{ color: 'var(--mint)' }}>{totalKpis}</div><div className="delta flat"><span>·</span><span>numeric findings</span></div></div>
        <div className="kpi-tile"><div className="label">Insights written</div><div className="value" style={{ color: 'var(--gold)' }}>{totalInsights}</div><div className="delta flat"><span>·</span><span>narrative findings</span></div></div>
      </div>

      <div className="ornament mb-4">recent reports</div>
      <section className="plate">
        {!loaded ? (
          <div className="py-12 text-center text-ink-3"><span className="spinner" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <div className="font-display text-[20px]" style={{ color: 'var(--ink-2)' }}>No reports yet.</div>
            <div className="text-[13px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
              Head to <Link href="/upload" className="underline" style={{ color: 'var(--navy)' }}>Upload</Link> to drop your first CSV.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.slice(0, 10).map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="block px-5 py-4 hover:bg-paperSoft transition-colors">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="font-display font-semibold text-[17px]" style={{ color: 'var(--ink-1)' }}>{r.title}</div>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {r.period_start || '—'} → {r.period_end || '—'} · {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.summary_preview && <p className="text-[12.5px] italic mt-1 line-clamp-2" style={{ color: 'var(--ink-2)' }}>{r.summary_preview}</p>}
                  <div className="mt-2 flex gap-2 text-[10.5px] font-mono uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                    <span>{r.rows_total.toLocaleString()} rows</span>
                    <span style={{ color: 'var(--navy)' }}>· {r.kpis_count} KPIs</span>
                    <span style={{ color: 'var(--gold)' }}>· {r.insights_count} insights</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
