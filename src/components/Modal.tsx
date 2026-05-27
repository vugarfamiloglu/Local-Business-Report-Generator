'use client';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean; title: string; children: ReactNode; actions?: ReactNode;
  onClose: () => void;
}
export function Modal({ open, title, children, actions, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open || typeof window === 'undefined') return null;
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="body">{children}</div>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
