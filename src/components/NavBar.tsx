'use client';

/* AppShell — sidebar + sticky TopBar + main workbench. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { Brand } from './Brand';
import { TopBar, deriveHeader, type TopBarHeader } from './TopBar';

const NAV: Array<{ href: string; label: string; glyph: string }> = [
  { href: '/',         label: 'Dashboard', glyph: '◎' },
  { href: '/upload',   label: 'Upload',    glyph: '↥' },
  { href: '/reports',  label: 'Reports',   glyph: '☷' },
  { href: '/sources',  label: 'Sources',   glyph: '✦' },
  { href: '/settings', label: 'Settings',  glyph: '⚙' },
];

interface Props { children: ReactNode; header?: TopBarHeader; }

export function AppShell({ children, header }: Props) {
  const path = usePathname();
  const effective: TopBarHeader = { ...deriveHeader(path), ...(header || {}) };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="px-1 mb-6"><Brand /></div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = n.href === '/' ? path === '/' : path?.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`sidebar-link ${active ? 'is-active' : ''}`}>
                <span className="glyph">{n.glyph}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-line">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--ink-4)' }}>
            quarterly · bond
          </div>
        </div>
      </aside>

      <TopBar header={effective} />

      <main className="workbench">{children}</main>
    </div>
  );
}
