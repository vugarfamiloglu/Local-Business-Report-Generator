'use client';
import { useEffect, useState } from 'react';
type Theme = 'light' | 'dark';
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('tally-theme')) as Theme | null;
    const initial: Theme = stored === 'dark' || stored === 'light' ? stored : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);
  function flip() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('tally-theme', next); } catch {}
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={flip} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? '☾' : '☀'} <span className="font-mono" style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 2 }}>{theme}</span>
    </button>
  );
}
