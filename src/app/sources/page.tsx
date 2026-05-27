'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/NavBar';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SourceBadge, sourceLabel } from '@/components/SourceBadge';
import { toast } from '@/components/Toaster';

interface Src { id: string; kind: string; label: string; handle: string | null; created_at: number; }

const KINDS = [
  { id: 'instagram', label: 'Instagram DM' },
  { id: 'whatsapp',  label: 'WhatsApp' },
  { id: 'pos',       label: 'PoS / Register' },
  { id: 'sheets',    label: 'Google Sheets' },
  { id: 'other',     label: 'Other' },
];

export default function SourcesPage() {
  const [rows,    setRows]    = useState<Src[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [delId,   setDelId]   = useState<string | null>(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const d = await fetch('/api/sources').then((r) => r.json()).catch(() => ({ sources: [] }));
    setRows(d.sources || []);
  }
  async function confirmDelete() {
    if (!delId) return;
    await fetch(`/api/sources/${delId}`, { method: 'DELETE' });
    setDelId(null); refresh(); toast('success', 'Source removed');
  }

  return (
    <AppShell header={{ action: <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add source</button> }}>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="label-eyebrow mb-2">Catalogue</div>
          <h1 className="heading-hero">Sources.</h1>
          <p className="lede mt-3 max-w-2xl">
            Label each place customer data comes from. The upload page auto-detects the kind
            from CSV headers, but the labels here let you keep your historical context
            (which account, which till, which sheet tab).
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.length === 0 && (
          <div className="col-span-full plate p-10 text-center" style={{ color: 'var(--ink-3)' }}>
            No labelled sources yet. Optional — upload works without them.
          </div>
        )}
        {rows.map((s) => (
          <article key={s.id} className="plate p-4 flex items-start gap-3">
            <SourceBadge kind={s.kind} size={40} />
            <div className="grow min-w-0">
              <div className="font-display font-semibold text-[17px] truncate" style={{ color: 'var(--ink-1)' }}>{s.label}</div>
              <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {sourceLabel(s.kind)}{s.handle ? ` · ${s.handle}` : ''}
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => setDelId(s.id)}>×</button>
          </article>
        ))}
      </div>

      <AddSourceDialog open={showAdd} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refresh(); }} />
      <ConfirmModal open={!!delId}
        title="Delete this source?"
        message="Past reports keep their context. Future uploads tagged with this kind will need a new label."
        confirmText="Delete" destructive
        onCancel={() => setDelId(null)} onConfirm={confirmDelete} />
    </AppShell>
  );
}

function AddSourceDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [kind,   setKind]   = useState('instagram');
  const [label,  setLabel]  = useState('');
  const [handle, setHandle] = useState('');
  const [busy,   setBusy]   = useState(false);

  useEffect(() => { if (open) { setKind('instagram'); setLabel(''); setHandle(''); } }, [open]);

  async function save() {
    if (!label.trim()) { toast('warn', 'Label is required'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, label: label.trim(), handle: handle.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      toast('success', 'Source added'); onSaved();
    } catch (e: any) { toast('error', e?.message || 'Save failed'); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a source" actions={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <><span className="spinner" /> Saving…</> : 'Save'}</button>
      </>
    }>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label className="label-eyebrow">Kind</label>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        <div className="field"><label className="label-eyebrow">Label *</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="@lavandacafe IG · Till #1 · …" />
        </div>
      </div>
      <div className="field mt-3"><label className="label-eyebrow">Handle / identifier (optional)</label>
        <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@username · phone · sheet id" />
      </div>
    </Modal>
  );
}
