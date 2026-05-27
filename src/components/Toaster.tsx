'use client';
import { useEffect, useState } from 'react';
type Kind = 'success' | 'error' | 'info' | 'warn';
interface ToastItem { id: number; kind: Kind; text: string; }
const listeners = new Set<(t: ToastItem) => void>();
let nextId = 1;
export function toast(kind: Kind, text: string) {
  const t: ToastItem = { id: nextId++, kind, text };
  listeners.forEach((fn) => fn(t));
}
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const fn = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4500);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return (
    <div className="toast-stack">
      {items.map((t) => <div key={t.id} className={`toast t-${t.kind}`}>{t.text}</div>)}
    </div>
  );
}
