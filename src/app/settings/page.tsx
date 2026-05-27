'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/NavBar';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PasswordInput } from '@/components/PasswordInput';
import { toast } from '@/components/Toaster';
import { DEFAULT_MODELS, PROVIDER_LABELS, type ProviderId } from '@/lib/providers';

interface KeyRow { id: string; provider: ProviderId; label: string; model: string | null; is_default: boolean; created_at: number; }

export default function SettingsPage() {
  const [rows,    setRows]    = useState<KeyRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [delId,   setDelId]   = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const d = await fetch('/api/providers').then((r) => r.json()).catch(() => ({ keys: [] }));
    setRows(d.keys || []);
  }
  async function setDefault(id: string) {
    await fetch(`/api/providers/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ is_default: true }) });
    refresh(); toast('success', 'Default updated');
  }
  async function test(id: string) {
    setTesting(id);
    try {
      const res = await fetch('/api/providers/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
      const d = await res.json();
      if (d.ok) toast('success', `Key works · ${d.model} · ${d.latency_ms}ms`);
      else      toast('error', d.error || 'Test failed');
    } catch (e: any) { toast('error', e?.message || 'Test failed'); }
    finally { setTesting(null); }
  }
  async function confirmDelete() {
    if (!delId) return;
    await fetch(`/api/providers/${delId}`, { method: 'DELETE' });
    setDelId(null); refresh(); toast('success', 'Key removed');
  }

  const byProvider = (p: ProviderId) => rows.filter((r) => r.provider === p);

  return (
    <AppShell header={{ action: <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add provider key</button> }}>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="label-eyebrow mb-2">Configuration</div>
          <h1 className="heading-hero">Settings.</h1>
          <p className="lede mt-3 max-w-2xl">
            Tally runs entirely on your own AI keys — bring keys for OpenAI, Anthropic, or
            Google Gemini. Each is AES-256-GCM-encrypted at rest and never echoed back to
            the UI after save.
          </p>
        </div>
      </div>

      {(['openai','anthropic','gemini'] as ProviderId[]).map((p) => {
        const list = byProvider(p);
        return (
          <section key={p} className="plate p-5 mb-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="heading-2">{PROVIDER_LABELS[p]}</h2>
              <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>default model · {DEFAULT_MODELS[p]}</span>
            </div>
            {list.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>No {PROVIDER_LABELS[p]} keys added yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {list.map((r) => (
                  <li key={r.id} className="py-3 flex items-center gap-3 flex-wrap">
                    {r.is_default && <span className="chip is-mint">DEFAULT</span>}
                    <div className="grow min-w-0">
                      <div className="font-display font-semibold text-[14px]">{r.label}</div>
                      <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                        {r.model || DEFAULT_MODELS[p]} · added {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!r.is_default && <button className="btn btn-ghost btn-sm" onClick={() => setDefault(r.id)}>★ Default</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => test(r.id)} disabled={testing === r.id}>
                        {testing === r.id ? <><span className="spinner" /> Pinging…</> : 'Test'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDelId(r.id)}>×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section className="plate p-5">
        <h2 className="heading-2 mb-2">Where these keys are used</h2>
        <ul className="text-[13px] flex flex-col gap-1.5" style={{ color: 'var(--ink-2)' }}>
          <li>· <strong style={{ color: 'var(--ink-1)' }}>Upload → ☷ Generate report</strong> picks the provider you select on that page. OpenAI is a great default for English+AZ; Anthropic excels at narrative tone.</li>
          <li>· Encrypted blobs live in <span className="font-mono">data/tally.db</span>; the vault key in <span className="font-mono">data/.vault-key</span> (mode 0600 on POSIX).</li>
          <li>· The CSVs you upload are parsed entirely in the browser. Only a 12KB sample per dataset is sent to the AI provider when you press Generate.</li>
        </ul>
      </section>

      <AddKeyDialog open={showAdd} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refresh(); }} />

      <ConfirmModal open={!!delId}
        title="Delete this provider key?"
        message="The encrypted blob is removed. Past reports stay; future generation on that provider will fail until another key is added."
        confirmText="Delete" destructive
        onCancel={() => setDelId(null)} onConfirm={confirmDelete} />
    </AppShell>
  );
}

function AddKeyDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [provider, setProvider] = useState<ProviderId>('openai');
  const [label, setLabel]       = useState('');
  const [key,   setKey]         = useState('');
  const [model, setModel]       = useState('');
  const [def,   setDef]         = useState(true);
  const [busy,  setBusy]        = useState(false);

  useEffect(() => { if (open) { setProvider('openai'); setLabel(''); setKey(''); setModel(''); setDef(true); } }, [open]);

  async function save() {
    if (!label.trim()) { toast('warn', 'Label is required'); return; }
    if (key.length < 8) { toast('warn', 'API key looks too short'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider, label: label.trim(),
          api_key: key,
          model: model.trim() || undefined,
          is_default: def,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      toast('success', 'Key added');
      onSaved();
    } catch (e: any) { toast('error', e?.message || 'Save failed'); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a provider key" actions={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <><span className="spinner" /> Saving…</> : 'Save key'}</button>
      </>
    }>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label className="label-eyebrow">Provider</label>
          <select className="select" value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        <div className="field"><label className="label-eyebrow">Label *</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Personal · OpenAI" />
        </div>
      </div>
      <div className="field mt-3"><label className="label-eyebrow">API key *</label>
        <PasswordInput value={key} onChange={setKey} placeholder={provider === 'openai' ? 'sk-…' : provider === 'anthropic' ? 'sk-ant-…' : 'AIza…'} />
      </div>
      <div className="field mt-3"><label className="label-eyebrow">Model (optional)</label>
        <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder={`default: ${DEFAULT_MODELS[provider]}`} />
      </div>
      <label className="flex items-center gap-2 mt-3 text-[13px] cursor-pointer">
        <input type="checkbox" checked={def} onChange={(e) => setDef(e.target.checked)} />
        Use as default for {PROVIDER_LABELS[provider]}
      </label>
    </Modal>
  );
}
