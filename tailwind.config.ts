import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        fg: 'hsl(var(--fg) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        level: {
          1: 'hsl(var(--level-1) / <alpha-value>)',
          2: 'hsl(var(--level-2) / <alpha-value>)',
          3: 'hsl(var(--level-3) / <alpha-value>)',
          4: 'hsl(var(--level-4) / <alpha-value>)',
          5: 'hsl(var(--level-5) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      letterSpacing: {
        tightHeading: '-0.02em',
      },
      maxWidth: {
        content: 'var(--maxw-content)',
        narrow: 'var(--maxw-narrow)',
      },
    },
  },
  plugins: [],
} satisfies Config;
