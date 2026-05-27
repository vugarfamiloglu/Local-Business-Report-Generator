'use client';
import Image from 'next/image';
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/logo.svg" alt="Tally" width={32} height={32} priority />
      {!compact && (
        <div className="leading-none">
          <div className="font-display font-bold text-[18px] tracking-tight" style={{ color: 'var(--ink-1)' }}>
            Tally
          </div>
          <div className="font-mono text-[9.5px] tracking-[0.22em] uppercase mt-1.5" style={{ color: 'var(--ink-3)' }}>
            report · generator
          </div>
        </div>
      )}
    </div>
  );
}
