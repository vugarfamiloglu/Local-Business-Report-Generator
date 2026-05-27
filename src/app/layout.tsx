import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'Tally — local-business report generator',
  description: 'Drop a CSV from Instagram DMs, WhatsApp, PoS, or Google Sheets. Get a 1-page natural-language monthly report — KPIs, top categories, patterns, recommendations.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('tally-theme');
            if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
          } catch (e) {}
        `}} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
