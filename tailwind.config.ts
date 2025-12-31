import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        accent: 'var(--accent)',
        muted: 'var(--muted)',
        panel: 'var(--panel)',
        border: 'var(--rule)',
        borderStrong: 'var(--rule-strong)',
        level: {
          1: 'var(--level-1)',
          2: 'var(--level-2)',
          3: 'var(--level-3)',
          4: 'var(--level-4)',
          5: 'var(--level-5)',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      maxWidth: {
        content: 'var(--maxw-content)',
        narrow: 'var(--maxw-narrow)',
      },
      fontFamily: {
        serif: ['ui-serif', 'Georgia', 'Times New Roman', 'Times', 'serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      letterSpacing: {
        label: 'var(--label-tracking)',
      },
    },
  },
  plugins: [],
} satisfies Config;
