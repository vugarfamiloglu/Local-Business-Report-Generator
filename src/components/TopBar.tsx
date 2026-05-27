'use client';

/* TopBar — sticky page header above the workbench.
 *
 * Anatomy (left → right):
 *   1. page-mark        small tally glyph in a navy chip
 *   2. chevron + crumb  TALLY breadcrumb
 *   3. title + subtitle Crimson Pro display + italic subtitle
 *
 *   4. centered badge   most-recent report count (live)
 *
 *   5. action           page-supplied React node
 *   6. ThemeToggle
 *   7. Sign-out
 *
 * Pages don't need to do anything — AppShell derives defaults from the
 * pathname via deriveHeader(). Pages override via the `header` prop. */

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { ConfirmModal } from './ConfirmModal';

export interface TopBarHeader {
  crumb?:    string;
  title?:    string;
  subtitle?: string;
  action?:   ReactNode;
  hideBadge?: boolean;
}

interface Props { header?: TopBarHeader; }

export function TopBar({ header }: Props) {
  const router = useRouter();
  const [signOut, setSignOut] = useState(false);

  /* Smooth shadow when the page is scrolled. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Live "reports drafted this period" badge — one fetch on mount. */
  const [reportsCount, setReportsCount] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    fetch('/api/reports?limit=200')
      .then((r) => r.ok ? r.json() : { reports: [] })
      .then((d) => { if (!stop) setReportsCount((d.reports || []).length); })
      .catch(() => {});
    return () => { stop = true; };
  }, []);

  async function doSignOut() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="topbar-left">
        <span className="topbar-mark" aria-hidden>
          {/* tally-mark glyph echoing the logo */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="7"  y1="6"  x2="7"  y2="18" />
            <line x1="10" y1="6"  x2="10" y2="18" />
            <line x1="13" y1="6"  x2="13" y2="18" />
            <line x1="16" y1="6"  x2="16" y2="18" />
            <line x1="5"  y1="17" x2="18" y2="7"  />
          </svg>
        </span>
        <span className="topbar-chevron">›</span>
        {header?.crumb && <span className="topbar-crumb">{header.crumb}</span>}
        <div className="topbar-title-stack">
          <div className="topbar-title">{header?.title || '—'}</div>
          {header?.subtitle && <div className="topbar-subtitle">{header.subtitle}</div>}
        </div>
      </div>

      <div className="topbar-center">
        {!header?.hideBadge && reportsCount !== null && (
          <a href="/reports" className="topbar-badge" title="Open the reports library">
            <span className="topbar-badge-dot" />
            <span className="topbar-badge-label">Reports</span>
            <span className="topbar-badge-num">{reportsCount}</span>
            <span className="topbar-badge-lbl">on file</span>
          </a>
        )}
      </div>

      <div className="topbar-right">
        {header?.action}
        <ThemeToggle />
        <button className="btn btn-ghost btn-sm" onClick={() => setSignOut(true)}>Sign out</button>
      </div>

      <ConfirmModal open={signOut}
        title="Sign out of Tally?"
        message="You'll need the passcode again on next visit."
        confirmText="Sign out"
        onCancel={() => setSignOut(false)}
        onConfirm={() => { setSignOut(false); doSignOut(); }} />
    </header>
  );
}

export function deriveHeader(pathname: string | null): TopBarHeader {
  const p = pathname || '/';
  if (p === '/')               return { crumb: 'Tally', title: 'Dashboard', subtitle: 'Mission control' };
  if (p.startsWith('/upload')) return { crumb: 'Tally', title: 'Upload',    subtitle: 'Drop a CSV, configure, generate' };
  if (p.startsWith('/reports'))return { crumb: 'Tally', title: 'Reports',   subtitle: 'Generated briefings' };
  if (p.startsWith('/sources'))return { crumb: 'Tally', title: 'Sources',   subtitle: 'Where the data comes from' };
  if (p.startsWith('/settings'))return { crumb: 'Tally', title: 'Settings', subtitle: 'Configuration' };
  return { crumb: 'Tally', title: '—' };
}
