import type { PDFPage, PDFFont, RGB } from 'pdf-lib';
import { COLORS, PAGE, FONT, SPACE } from './specTokens';

export function fillPageBackground(page: PDFPage): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.W,
    height: PAGE.H,
    color: COLORS.bgPrimary,
  });
}

export function drawHeaderBar(opts: {
  page: PDFPage;
  fontBold: PDFFont;
  font: PDFFont;
  dateStr: string;
  company?: string | null;
}): void {
  const { page, fontBold, font, dateStr, company } = opts;
  const y = PAGE.H - PAGE.M + SPACE[2];

  page.drawText('MAXMIN', {
    x: PAGE.M,
    y,
    size: FONT.caption,
    font: fontBold,
    color: COLORS.textSecondary,
  });

  const rightItems: string[] = [];
  if (company) rightItems.push(company);
  rightItems.push(dateStr);
  const rightText = rightItems.join('  |  ');
  const rightW = font.widthOfTextAtSize(rightText, FONT.caption);

  page.drawText(rightText, {
    x: PAGE.W - PAGE.M - rightW,
    y,
    size: FONT.caption,
    font,
    color: COLORS.textMuted,
  });
}

export function drawFooter(opts: {
  page: PDFPage;
  font: PDFFont;
  pageNum: number;
  totalPages: number;
}): void {
  const { page, font, pageNum, totalPages } = opts;
  const y = PAGE.M - SPACE[6];

  page.drawText('maxmin.agency', {
    x: PAGE.M,
    y,
    size: FONT.micro,
    font,
    color: COLORS.textMuted,
  });

  const pageLabel = `${pageNum} / ${totalPages}`;
  const pw = font.widthOfTextAtSize(pageLabel, FONT.micro);
  page.drawText(pageLabel, {
    x: PAGE.W - PAGE.M - pw,
    y,
    size: FONT.micro,
    font,
    color: COLORS.textMuted,
  });
}

export function drawSectionHeader(opts: {
  page: PDFPage;
  fontBold: PDFFont;
  number: string;
  title: string;
  x: number;
  y: number;
}): number {
  const { page, fontBold, number, title, x, y } = opts;

  page.drawText(number, {
    x,
    y,
    size: FONT.caption,
    font: fontBold,
    color: COLORS.textMuted,
  });

  page.drawText(title.toUpperCase(), {
    x: x + 24,
    y,
    size: FONT.sectionHeader,
    font: fontBold,
    color: COLORS.textPrimary,
  });

  return y - SPACE[6];
}

export function wrapLines(opts: {
  text: string;
  font: PDFFont;
  size: number;
  maxWidth: number;
}): string[] {
  const { text, font, size, maxWidth } = opts;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawParagraph(opts: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  y: number;
  size: number;
  color: RGB;
  maxWidth: number;
  lineHeight?: number;
  maxLines?: number;
}): number {
  const { page, font, text, x, size, color, maxWidth, lineHeight = size * 1.4, maxLines = 100 } = opts;
  let { y } = opts;

  const lines = wrapLines({ text, font, size, maxWidth }).slice(0, maxLines);

  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }

  return y;
}

export function drawCalloutBox(opts: {
  page: PDFPage;
  fontBold: PDFFont;
  font: PDFFont;
  x: number;
  y: number;
  w: number;
  title: string;
  subtitle?: string;
  body: string;
  accent: RGB;
}): number {
  const { page, fontBold, font, x, y, w, title, subtitle, body, accent } = opts;
  const pad = SPACE[4];
  const lineH = FONT.bodySmall * 1.4;

  const bodyLines = wrapLines({ text: body, font, size: FONT.bodySmall, maxWidth: w - pad * 2 - 4 });
  const boxH = pad + FONT.body + (subtitle ? lineH : 0) + bodyLines.length * lineH + pad;

  page.drawRectangle({
    x,
    y: y - boxH,
    width: w,
    height: boxH,
    color: COLORS.bgSecondary,
    borderColor: COLORS.borderMedium,
    borderWidth: 1,
  });

  page.drawRectangle({
    x,
    y: y - boxH,
    width: 4,
    height: boxH,
    color: accent,
  });

  let ty = y - pad - FONT.body;
  page.drawText(title, {
    x: x + pad + 4,
    y: ty,
    size: FONT.body,
    font: fontBold,
    color: COLORS.textPrimary,
  });

  if (subtitle) {
    ty -= lineH;
    page.drawText(subtitle, {
      x: x + pad + 4,
      y: ty,
      size: FONT.bodySmall,
      font,
      color: COLORS.textSecondary,
    });
  }

  ty -= lineH;
  for (const line of bodyLines) {
    page.drawText(line, {
      x: x + pad + 4,
      y: ty,
      size: FONT.bodySmall,
      font,
      color: COLORS.textAccent,
    });
    ty -= lineH;
  }

  return y - boxH - SPACE[4];
}

export function drawScoreBar(opts: {
  page: PDFPage;
  x: number;
  y: number;
  score: number;
  width: number;
  fillColor: RGB;
}): void {
  const { page, x, y, score, width, fillColor } = opts;
  const barH = 8;
  const fillW = Math.max(0, Math.min(1, score / 5)) * width;

  page.drawRectangle({
    x,
    y,
    width,
    height: barH,
    color: COLORS.bgTertiary,
  });

  if (fillW > 0) {
    page.drawRectangle({
      x,
      y,
      width: fillW,
      height: barH,
      color: fillColor,
    });
  }
}

export function drawRadar(opts: {
  page: PDFPage;
  x: number;
  y: number;
  size: number;
  scores: number[];
  stroke: RGB;
  fill: RGB;
}): void {
  const { page, x, y, size, scores, stroke, fill } = opts;
  const n = scores.length;
  if (n < 3) return;

  const angleStep = (2 * Math.PI) / n;
  const r = size / 2;

  for (let ring = 1; ring <= 5; ring++) {
    const ringR = (ring / 5) * r;
    for (let i = 0; i < n; i++) {
      const a1 = -Math.PI / 2 + i * angleStep;
      const a2 = -Math.PI / 2 + ((i + 1) % n) * angleStep;
      const x1 = x + Math.cos(a1) * ringR;
      const y1 = y + Math.sin(a1) * ringR;
      const x2 = x + Math.cos(a2) * ringR;
      const y2 = y + Math.sin(a2) * ringR;
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.5,
        color: COLORS.borderSubtle,
      });
    }
  }

  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    page.drawLine({
      start: { x, y },
      end: { x: px, y: py },
      thickness: 0.5,
      color: COLORS.borderSubtle,
    });
  }

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const scoreR = (Math.min(5, Math.max(0, scores[i])) / 5) * r;
    points.push({
      x: x + Math.cos(angle) * scoreR,
      y: y + Math.sin(angle) * scoreR,
    });
  }

  if (points.length >= 3) {
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      page.drawLine({
        start: p1,
        end: p2,
        thickness: 2,
        color: stroke,
      });
    }

    for (const pt of points) {
      page.drawCircle({
        x: pt.x,
        y: pt.y,
        size: 3,
        color: fill,
      });
    }
  }
}

export function drawBulletList(opts: {
  page: PDFPage;
  font: PDFFont;
  items: string[];
  x: number;
  y: number;
  maxWidth: number;
  size?: number;
  color?: RGB;
  lineHeight?: number;
  bullet?: string;
}): number {
  const {
    page,
    font,
    items,
    x,
    maxWidth,
    size = FONT.bodySmall,
    color = COLORS.textAccent,
    lineHeight = size * 1.5,
    bullet = '-',
  } = opts;
  let { y } = opts;

  const bulletW = font.widthOfTextAtSize(bullet + ' ', size);

  for (const item of items) {
    page.drawText(bullet, { x, y, size, font, color: COLORS.textMuted });

    const lines = wrapLines({ text: item, font, size, maxWidth: maxWidth - bulletW });
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], {
        x: x + bulletW,
        y: y - i * lineHeight,
        size,
        font,
        color,
      });
    }
    y -= lines.length * lineHeight;
  }

  return y;
}

export function drawChecklistSection(opts: {
  page: PDFPage;
  fontBold: PDFFont;
  font: PDFFont;
  title: string;
  items: string[];
  x: number;
  y: number;
  maxWidth: number;
}): number {
  const { page, fontBold, font, title, items, x, maxWidth } = opts;
  let { y } = opts;

  if (items.length === 0) return y;

  page.drawText(title.toUpperCase(), {
    x,
    y,
    size: FONT.caption,
    font: fontBold,
    color: COLORS.textSecondary,
  });
  y -= SPACE[4];

  y = drawBulletList({
    page,
    font,
    items,
    x,
    y,
    maxWidth,
    size: FONT.bodySmall,
    color: COLORS.textAccent,
    bullet: '[ ]',
  });

  return y - SPACE[4];
}
