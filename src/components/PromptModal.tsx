'use client';
import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
interface Props {
  open: boolean; title: string; message?: string; placeholder?: string; initial?: string;
  confirmText?: string; cancelText?: string;
  onSubmit: (value: string) => void; onCancel: () => void;
}
export function PromptModal({
  open, title, message, placeholder, initial = '',
  confirmText = 'Save', cancelText = 'Cancel', onSubmit, onCancel,
}: Props) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setValue(initial); setTimeout(() => ref.current?.focus(), 30); } }, [open, initial]);
  return (
    <Modal open={open} onClose={onCancel} title={title} actions={
      <>
        <button className="btn btn-ghost" onClick={onCancel}>{cancelText}</button>
        <button className="btn btn-primary" onClick={() => onSubmit(value.trim())}>{confirmText}</button>
      </>
    }>
      {message && <p style={{ marginBottom: 10 }}>{message}</p>}
      <input ref={ref} className="input" placeholder={placeholder}
        value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(value.trim()); }} />
    </Modal>
  );
}
