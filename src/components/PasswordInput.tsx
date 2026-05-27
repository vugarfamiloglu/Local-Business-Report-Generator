'use client';
import { useState } from 'react';
interface Props {
  value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; disabled?: boolean; onSubmit?: () => void;
}
export function PasswordInput({ value, onChange, placeholder, autoFocus, disabled, onSubmit }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'} className="input" style={{ paddingRight: 44 }}
        value={value} autoFocus={autoFocus} disabled={disabled} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) onSubmit(); }} />
      <button type="button" onClick={() => setShow(!show)} title={show ? 'Hide' : 'Show'}
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 8, lineHeight: 0 }}>
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
function Eye()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOff() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }
