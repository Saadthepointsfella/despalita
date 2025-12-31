import { rgb, type RGB } from 'pdf-lib';

function hexToRgb01(hex: string): RGB {
  const h = hex.replace('#', '').trim();
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export const COLORS = {
  bgPrimary: hexToRgb01('#0A0A0A'),
  bgSecondary: hexToRgb01('#141414'),
  bgTertiary: hexToRgb01('#1A1A1A'),
  bgAccent: hexToRgb01('#1E1E1E'),
  textPrimary: hexToRgb01('#FFFFFF'),
  textSecondary: hexToRgb01('#A0A0A0'),
  textMuted: hexToRgb01('#666666'),
  textAccent: hexToRgb01('#E0E0E0'),
  borderSubtle: hexToRgb01('#222222'),
  borderMedium: hexToRgb01('#333333'),
  borderStrong: hexToRgb01('#444444'),
  level1: hexToRgb01('#EF4444'),
  level2: hexToRgb01('#F97316'),
  level3: hexToRgb01('#EAB308'),
  level4: hexToRgb01('#22C55E'),
  level5: hexToRgb01('#3B82F6'),
  criticalGap: hexToRgb01('#EF4444'),
  warning: hexToRgb01('#F97316'),
  primaryGap: hexToRgb01('#EAB308'),
  strength: hexToRgb01('#22C55E'),
} as const;

export function levelColor(level: 1 | 2 | 3 | 4 | 5): RGB {
  return [COLORS.level1, COLORS.level2, COLORS.level3, COLORS.level4, COLORS.level5][level - 1];
}

export function tierColor(tier: 'low' | 'medium' | 'high'): RGB {
  switch (tier) {
    case 'low':
      return COLORS.level1;
    case 'medium':
      return COLORS.level3;
    case 'high':
      return COLORS.level5;
    default:
      return COLORS.textSecondary;
  }
}

export const SPACE = {
  1: 3,
  2: 6,
  3: 9,
  4: 12,
  6: 18,
  8: 24,
  10: 30,
  12: 36,
  16: 48,
} as const;

export const PAGE = {
  W: 595,
  H: 842,
  M: 50,
  contentW: 495,
} as const;

export const FONT = {
  heroTitle: 28,
  pageTitle: 20,
  sectionHeader: 16,
  bodyLarge: 12,
  body: 10,
  bodySmall: 9,
  caption: 8,
  micro: 7,
} as const;
