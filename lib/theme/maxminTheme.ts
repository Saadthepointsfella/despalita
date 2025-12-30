/**
 * Centralized theme tokens for OG, PDF, and email generation.
 * Uses the same HSL values as globals.css but in formats suitable
 * for server-side rendering contexts.
 */

export const maxminTheme = {
  colors: {
    // Background colors
    bg: 'hsl(45, 30%, 96%)',        // --bg
    surface: 'hsl(45, 30%, 98%)',   // --surface

    // Text colors
    fg: 'hsl(45, 25%, 12%)',        // --fg
    muted: 'hsl(45, 10%, 45%)',     // --muted

    // Border colors
    border: 'hsl(45, 20%, 80%)',    // --border

    // Accent colors
    accent: 'hsl(15, 80%, 50%)',    // --accent (editorial orange)
    accentFg: 'hsl(0, 0%, 100%)',   // --accent-fg

    // Status colors
    success: 'hsl(142, 70%, 45%)',
    warning: 'hsl(45, 90%, 55%)',
    danger: 'hsl(0, 70%, 55%)',
  },

  fonts: {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Newsreader, Georgia, serif',
    mono: 'Space Mono, Consolas, monospace',
  },

  // Level colors for badges
  levelColors: {
    1: { bg: 'hsl(0, 70%, 95%)', fg: 'hsl(0, 70%, 35%)', label: 'Foundation' },
    2: { bg: 'hsl(45, 80%, 95%)', fg: 'hsl(45, 80%, 35%)', label: 'Developing' },
    3: { bg: 'hsl(200, 70%, 95%)', fg: 'hsl(200, 70%, 35%)', label: 'Established' },
    4: { bg: 'hsl(142, 70%, 95%)', fg: 'hsl(142, 70%, 35%)', label: 'Advanced' },
    5: { bg: 'hsl(270, 70%, 95%)', fg: 'hsl(270, 70%, 35%)', label: 'Optimized' },
  } as Record<number, { bg: string; fg: string; label: string }>,

  // Tier colors
  tierColors: {
    low: { bg: 'hsl(0, 60%, 95%)', fg: 'hsl(0, 60%, 40%)' },
    medium: { bg: 'hsl(45, 70%, 95%)', fg: 'hsl(45, 70%, 35%)' },
    high: { bg: 'hsl(142, 60%, 95%)', fg: 'hsl(142, 60%, 35%)' },
  } as Record<string, { bg: string; fg: string }>,
} as const;

export type MaxminTheme = typeof maxminTheme;
