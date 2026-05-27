'use client';

const KINDS: Record<string, { letter: string; bg: string; fg: string; label: string }> = {
  instagram: { letter: 'I',  bg: 'rgba(176, 138, 64, .15)', fg: '#b08a40', label: 'Instagram' },
  whatsapp:  { letter: 'W',  bg: 'rgba(58, 138, 82, .15)',  fg: '#3a8a52', label: 'WhatsApp' },
  pos:       { letter: 'P',  bg: 'rgba(30, 58, 138, .15)',  fg: '#1e3a8a', label: 'PoS / Register' },
  sheets:    { letter: 'G',  bg: 'rgba(185, 77, 30, .15)',  fg: '#b94d1e', label: 'Google Sheets' },
  other:     { letter: '·',  bg: 'rgba(107, 120, 136, .15)', fg: '#6b7888', label: 'Other' },
};
export function SourceBadge({ kind, size = 28 }: { kind: string; size?: number }) {
  const m = KINDS[kind] || KINDS.other;
  return (
    <span title={m.label}
      style={{
        width: size, height: size, borderRadius: 4,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: m.bg, color: m.fg, border: `1px solid ${m.fg}`,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: size * 0.42, fontWeight: 700,
      }}>{m.letter}</span>
  );
}
export function sourceLabel(kind: string): string { return (KINDS[kind] || KINDS.other).label; }
