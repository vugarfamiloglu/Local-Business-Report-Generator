'use client';

interface Props {
  label: string; value: string;
  delta_pct: number | null;
  direction: 'up' | 'down' | 'flat';
}

export function KpiTile({ label, value, delta_pct, direction }: Props) {
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–';
  return (
    <div className="kpi-tile">
      <div className="label">{label}</div>
      <div className="value">{value || '—'}</div>
      {delta_pct !== null ? (
        <div className={`delta ${direction}`}>
          <span>{arrow}</span>
          <span>{Math.abs(delta_pct)}%</span>
          <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 4 }}>vs prior</span>
        </div>
      ) : (
        <div className="delta flat"><span>·</span><span>no comparison</span></div>
      )}
    </div>
  );
}
