import { rgb, type RGB } from 'pdf-lib';

// MaxMin brand palette (matches https://www.maxmin.agency/)
export const PdfColors = {
  // Backgrounds
  pageBg: hex('#F5F2EB'),      // Beige/cream from website
  cardBg: hex('#EDE9E0'),      // Slightly darker cream
  cardBg2: hex('#E8E5DE'),     // Light gray from website

  // Text
  textPrimary: hex('#1A1A1A'), // Black from website
  textBody: hex('#1A1A1A'),    // Same black for body
  textMuted: hex('#8A8A8A'),   // Gray from website

  // Borders
  border: hex('#E8E5DE'),      // Light gray from website

  // Accent
  accent: hex('#C54B4B'),      // Red accent from website

  // Level colors (keep for score visualization)
  level1: hex('#C54B4B'),      // Red (matches accent)
  level2: hex('#D97706'),      // Orange (warmer)
  level3: hex('#B8860B'),      // Dark goldenrod (warmer yellow)
  level4: hex('#2D7D46'),      // Forest green (more muted)
  level5: hex('#1A1A1A'),      // Black (excellence = brand black)
};

export const PdfSpacing = {
  s1: 3,
  s2: 6,
  s3: 9,
  s4: 12,
  s6: 18,
  s8: 24,
  s10: 30,
  s12: 36,
  s16: 48,
};

export const PdfLayout = {
  pageWidth: 595,
  pageHeight: 842, // A4
  margin: 50,
  headerHeight: 24,
  footerHeight: 24,
  contentWidth: 595 - 100,
};

export const PdfTypography = {
  heroTitle: 28,
  heroScore: 20,

  sectionHeader: 16,
  subsectionHeader: 12,

  body: 10,
  bodySmall: 9,

  caption: 8,
  micro: 7,

  lineHeightTight: 1.25,
  lineHeightNormal: 1.35,
  lineHeightRelaxed: 1.5,
};

export const PdfRules = {
  thin: 1,
  emph: 2,
  scoreBarHeight: 6,
};

export function getLevelColor(level: number): RGB {
  switch (level) {
    case 1: return PdfColors.level1;
    case 2: return PdfColors.level2;
    case 3: return PdfColors.level3;
    case 4: return PdfColors.level4;
    case 5: return PdfColors.level5;
    default: return PdfColors.textPrimary;
  }
}

/**
 * Deterministic date label: always YYYY-MM-DD (UTC).
 * Avoid locale/timezone drift in toLocaleDateString().
 */
export function formatDateUTC(createdAtISO: string): string {
  const d = new Date(createdAtISO);
  if (Number.isNaN(d.getTime())) return createdAtISO;
  return d.toISOString().slice(0, 10);
}

export function hex(h: string): RGB {
  const s = h.replace('#', '').trim();
  if (s.length !== 6) return rgb(0, 0, 0);
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}
