'use client';

import { useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?:   string;
  maxBytes?: number;
}

export function DropZone({ onFiles, multiple = true, accept = '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain', maxBytes = 10 * 1024 * 1024 }: Props) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function take(list: FileList | null) {
    if (!list || !list.length) return;
    const arr = Array.from(list).filter((f) => f.size > 0 && f.size <= maxBytes);
    if (arr.length) onFiles(arr);
  }

  return (
    <div
      className={`dropzone ${drag ? 'is-dragover' : ''}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files); }}>
      <div className="font-display text-[22px] font-semibold" style={{ color: 'var(--ink-1)' }}>
        Drop a CSV here
      </div>
      <div className="text-[13px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
        Or click to pick · CSV / TSV / TXT · up to {Math.round(maxBytes / 1024 / 1024)} MB
        <br/>Sources auto-detected: Instagram DM · WhatsApp · PoS · Google Sheets
      </div>
      <input ref={ref} type="file" hidden multiple={multiple} accept={accept}
        onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
