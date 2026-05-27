import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink:     { 1: 'var(--ink-1)', 2: 'var(--ink-2)', 3: 'var(--ink-3)', 4: 'var(--ink-4)' },
        paper:   'var(--paper)',
        paperSoft: 'var(--paper-soft)',
        surface: 'var(--surface)',
        line:    'var(--line)',
        navy:    'var(--navy)',
        mint:    'var(--mint)',
        brick:   'var(--brick)',
        gold:    'var(--gold)',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Crimson Pro"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
