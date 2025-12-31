import { rgb, type RGB } from 'pdf-lib';

// Swiss beige palette (matches maxmin.agency direction)
// NOTE: These are PDF-only theme tokens; keep UI tokens separate.
export const PdfColors = {
  pageBg: hex('#FAF9F6'),
  cardBg: hex('#F5F4F0'),
  cardBg2: hex('#F1F0EC'),
  textPrimary: hex('#1A1A1A'),
  textBody: hex('#3D3D3D'),
  textMuted: hex('#9A9A9A'),
  border: hex('#E5E4E0'),

  // Level colors
  level1: hex('#EF4444'),
  level2: hex('#F97316'),
  level3: hex('#EAB308'),
  level4: hex('#22C55E'),
  level5: hex('#3B82F6'),
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
  pageTitle: 20,
  sectionHeader: 16,
  bodyLarge: 12,
  body: 10,
  bodySmall: 9,
  caption: 8,
  micro: 7,
  lineHeightNormal: 1.3,
  lineHeightRelaxed: 1.5,
};

export function getLevelColor(level: number): RGB {
  switch (level) {
    case 1:
      return PdfColors.level1;
    case 2:
      return PdfColors.level2;
    case 3:
      return PdfColors.level3;
    case 4:
      return PdfColors.level4;
    case 5:
      return PdfColors.level5;
    default:
      return PdfColors.textPrimary;
  }
}

export function hex(h: string): RGB {
  const s = h.replace('#', '').trim();
  if (s.length !== 6) return rgb(0, 0, 0);
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}
