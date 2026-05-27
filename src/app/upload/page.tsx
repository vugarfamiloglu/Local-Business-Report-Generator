'use client';

/* /upload — the heart of the app.
 *
 * 1. Drop one or many CSV/TSV files
 * 2. Each gets auto-parsed in the browser (lib/parse.ts), labelled, source-kind-detected
 * 3. Optional: business name + goal + language + provider
 * 4. Press "Generate report" → POST /api/generate with the trimmed samples
 * 5. On success, jump to /reports/<id> */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/NavBar';
import { DropZone } from '@/components/DropZone';
import { SourceBadge, sourceLabel } from '@/components/SourceBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { toast } from '@/components/Toaster';
import { ingestText, type ParsedDataset, type SourceKind } from '@/lib/parse';

interface ProviderRow { id: string; provider: 'openai'|'anthropic'|'gemini'; is_default: boolean; }

const KIND_OPTIONS: Array<{ id: SourceKind; label: string }> = [
  { id: 'instagram', label: 'Instagram DM' },
  { id: 'whatsapp',  label: 'WhatsApp' },
  { id: 'pos',       label: 'PoS / Register' },
  { id: 'sheets',    label: 'Google Sheets' },
  { id: 'other',     label: 'Other' },
];

export default function UploadPage() {
  const router = useRouter();
  const [datasets,    setDatasets]    = useState<ParsedDataset[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [goal,        setGoal]        = useState('What grew, what shrank, where customers are stuck.');
  const [periodHint,  setPeriodHint]  = useState('Last 30 days');
  const [language,    setLanguage]    = useState<'en'|'az'|'ru'|'tr'>('en');
  const [provider,    setProvider]    = useState<'openai'|'anthropic'|'gemini'>('openai');
  const [keys,        setKeys]        = useState<ProviderRow[]>([]);
  const [busy,        setBusy]        = useState(false);
  const [clearAll,    setClearAll]    = useState(false);

  useEffect(() => {
    fetch('/api/providers').then((r) => r.json()).then((d) => {
      const list = (d.keys || []) as ProviderRow[];
      setKeys(list);
      const def = list.find((k) => k.is_default) || list[0];
      if (def) setProvider(def.provider);
    }).catch(() => {});
  }, []);

  const hasProvider = keys.some((k) => k.provider === provider);

  async function handleFiles(files: File[]) {
    const added: ParsedDataset[] = [];
    for (const f of files) {
      try {
        const text = await f.text();
        const ds = ingestText(text, { label: f.name });
        added.push(ds);
      } catch (e: any) {
        toast('error', `Failed to parse ${f.name}: ${e?.message || e}`);
      }
    }
    if (added.length) {
      setDatasets((prev) => [...prev, ...added]);
      toast('success', `Loaded ${added.length} file${added.length === 1 ? '' : 's'}`);
    }
  }
  function updateDataset(idx: number, fields: Partial<ParsedDataset>) {
    setDatasets((prev) => prev.map((d, i) => i === idx ? { ...d, ...fields } : d));
  }
  function removeDataset(idx: number) {
    setDatasets((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalRows = useMemo(() => datasets.reduce((s, d) => s + d.rowsCount, 0), [datasets]);
  const canGenerate = datasets.length > 0 && hasProvider && !busy;

  async function generate() {
    if (!canGenerate) return;
    setBusy(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          datasets: datasets.map((d) => ({
            kind: d.kind, label: d.label, headers: d.headers,
            rowsCount: d.rowsCount, dateRange: d.dateRange, sample: d.sample,
          })),
          business_name: businessName.trim() || undefined,
          language, period_hint: periodHint.trim() || undefined,
          goal_hint: goal.trim() || undefined,
          provider,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      toast('success', `Report ready · ${d.meta?.provider} · ${d.meta?.latency_ms}ms`);
      router.push(`/reports/${d.id}`);
    } catch (e: any) { toast('error', e?.message || 'Generation failed'); setBusy(false); }
  }

  return (
    <AppShell>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="label-eyebrow mb-2">Upload + generate</div>
          <h1 className="heading-hero">New report.</h1>
          <p className="lede mt-3 max-w-2xl">
            Drop one or more CSVs from Instagram DMs, WhatsApp exports, your point-of-sale, or
            Google Sheets. Tally parses each in your browser, you confirm the source kinds and
            labels, and one model call returns the full briefing.
          </p>
        </div>
      </div>

      <div className="ornament mb-4">01 · drop files</div>
      <DropZone onFiles={handleFiles} />

      {datasets.length > 0 && (
        <>
          <div className="ornament mt-10 mb-4">02 · confirm sources · {totalRows.toLocaleString()} rows total</div>
          <div className="space-y-3">
            {datasets.map((d, i) => (
              <article key={i} className="plate p-4 flex items-start gap-4 flex-wrap">
                <SourceBadge kind={d.kind} size={36} />
                <div className="grow min-w-0">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <input className="input" style={{ maxWidth: 360 }}
                      value={d.label} onChange={(e) => updateDataset(i, { label: e.target.value })} />
                    <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {d.rowsCount.toLocaleString()} rows · {d.headers.length} columns
                      {d.dateRange && ` · ${d.dateRange.start} → ${d.dateRange.end}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="label-eyebrow">Source kind</span>
                    <select className="select" style={{ maxWidth: 240 }}
                      value={d.kind} onChange={(e) => updateDataset(i, { kind: e.target.value as SourceKind })}>
                      {KIND_OPTIONS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                    </select>
                  </div>
                  <details className="mt-3">
                    <summary className="label-eyebrow cursor-pointer">Preview the first rows the model will see</summary>
                    <pre className="font-mono text-[10.5px] mt-2 p-3 max-h-[200px] scroll-y plate-soft" style={{ color: 'var(--ink-2)' }}>{d.sample.slice(0, 1800)}</pre>
                  </details>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeDataset(i)} title="Remove">×</button>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="ornament mt-10 mb-4">03 · context + provider</div>
      <div className="plate p-5 grid sm:grid-cols-2 gap-4">
        <div className="field"><label className="label-eyebrow">Business name (optional)</label>
          <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Lavanda Café" /></div>
        <div className="field"><label className="label-eyebrow">Period focus</label>
          <input className="input" value={periodHint} onChange={(e) => setPeriodHint(e.target.value)} placeholder="Last 30 days · March 2026 · Q1" /></div>
        <div className="field sm:col-span-2"><label className="label-eyebrow">Owner's question (what do you want to learn?)</label>
          <textarea className="textarea" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)}
            placeholder="What grew, what shrank, where customers are stuck." /></div>
        <div className="field"><label className="label-eyebrow">Language</label>
          <select className="select" value={language} onChange={(e) => setLanguage(e.target.value as any)}>
            <option value="en">English</option>
            <option value="az">Azerbaijani</option>
            <option value="ru">Russian</option>
            <option value="tr">Turkish</option>
          </select>
        </div>
        <div className="field"><label className="label-eyebrow">AI provider</label>
          <select className="select" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
          </select>
          {!hasProvider && <p className="text-[11.5px] mt-1" style={{ color: 'var(--warn)' }}>
            No {provider} key — add one in <a className="underline" href="/settings">Settings</a>.
          </p>}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mt-8 mb-12">
        <div className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          {datasets.length === 0 ? 'Drop at least one CSV to unlock the generator.'
            : !hasProvider ? `Add a ${provider} key first.`
            : `Ready to write a report from ${datasets.length} dataset${datasets.length === 1 ? '' : 's'}.`}
        </div>
        <div className="flex gap-2">
          {datasets.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setClearAll(true)}>Clear all</button>
          )}
          <button className="btn btn-primary" onClick={generate} disabled={!canGenerate}>
            {busy ? <><span className="spinner" /> Writing the report…</> : '☷ Generate report →'}
          </button>
        </div>
      </div>

      <ConfirmModal open={clearAll}
        title="Clear all uploaded files?"
        message="The parsed datasets are removed from this session. The original CSV files on your disk are untouched."
        confirmText="Clear" destructive
        onCancel={() => setClearAll(false)}
        onConfirm={() => { setClearAll(false); setDatasets([]); toast('info', 'Cleared'); }} />
    </AppShell>
  );
}
