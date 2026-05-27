'use client';
import { Modal } from './Modal';
interface Props {
  open: boolean; title: string; message: string;
  confirmText?: string; cancelText?: string; destructive?: boolean;
  onConfirm: () => void; onCancel: () => void;
}
export function ConfirmModal({
  open, title, message, confirmText = 'Confirm', cancelText = 'Cancel',
  destructive = false, onConfirm, onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} actions={
      <>
        <button className="btn btn-ghost" onClick={onCancel}>{cancelText}</button>
        <button className={destructive ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm} autoFocus>{confirmText}</button>
      </>
    }>{message}</Modal>
  );
}
