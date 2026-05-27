'use client';

interface Props { title: string; body: string; evidence: string; index?: number; }

export function InsightCard({ title, body, evidence, index }: Props) {
  return (
    <article className="plate p-5" style={{ borderLeft: '3px solid var(--gold)' }}>
      <div className="flex items-baseline gap-3 mb-1.5">
        {index !== undefined && (
          <span className="font-display font-bold text-[28px]" style={{ color: 'var(--gold)', lineHeight: 1 }}>
            {String(index).padStart(2, '0')}
          </span>
        )}
        <h3 className="font-display font-semibold text-[18px] leading-tight" style={{ color: 'var(--ink-1)' }}>{title}</h3>
      </div>
      <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: 'var(--ink-2)' }}>{body}</p>
      {evidence && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="label-eyebrow mb-1">Evidence</div>
          <p className="text-[12.5px] italic" style={{ color: 'var(--ink-3)' }}>&ldquo;{evidence}&rdquo;</p>
        </div>
      )}
    </article>
  );
}
