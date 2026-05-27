'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { PasswordInput } from '@/components/PasswordInput';
import { toast } from '@/components/Toaster';

export default function LoginPageWrapper() {
  return <Suspense fallback={null}><LoginPage /></Suspense>;
}

function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!pass) { toast('warn', 'Enter your passcode'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode: pass }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'sign-in failed');
      router.push(next);
    } catch (e: any) { toast('error', e?.message || 'sign-in failed'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="plate p-8" style={{ width: '100%', maxWidth: 440, borderTop: '4px solid var(--navy)' }}>
        <Brand />
        <h1 className="heading-1 mt-7">Open the ledger.</h1>
        <p className="text-[13.5px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
          Tally is locked behind a single passcode. Default is{' '}
          <span className="font-mono">tally-2026</span> — set <span className="font-mono">TALLY_PASSCODE_HASH</span> to change it.
        </p>

        <div className="mt-6">
          <label className="label-eyebrow">Passcode</label>
          <div className="mt-1.5">
            <PasswordInput value={pass} onChange={setPass} autoFocus
              placeholder="• • • • • • • • • •" onSubmit={submit} />
          </div>
        </div>

        <button className="btn btn-primary mt-5 w-full justify-center" onClick={submit} disabled={busy}>
          {busy ? <><span className="spinner" /> Unlocking…</> : 'Open Tally →'}
        </button>

        <div className="mt-6 ornament">drop · analyse · ship</div>
      </div>
    </div>
  );
}
