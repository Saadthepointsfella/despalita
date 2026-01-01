import type { PDFPage, RGB, PDFFont } from 'pdf-lib';
import { PdfLayout, PdfMotifs, PdfColors } from './theme';


export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizePdfText(text: string): string {
  return (text ?? '')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-') // hyphens/dashes
    .replace(/[\u2192\u2190\u2194\u21D2\u21D4]/g, '->') // arrows
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // double quotes
    .replace(/\u2026/g, '...') // ellipsis
    .replace(/\u00A0/g, ' '); // nbsp
}

/**
 * Split text into paragraphs (preserve explicit newlines),
 * then wrap each paragraph into lines.
 *
 * - Single newline acts like a space inside a paragraph
 * - Blank line separates paragraphs
 */
export function wrapParagraphs({
  text,
  font,
  fontSize,
  maxWidth,
}: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
}): string[] {
  const raw = normalizePdfText(text ?? '').replace(/\r\n/g, '\n');
  const paragraphs = raw
    .split(/\n\s*\n/g) // blank line => paragraph break
    .map(p => p.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const out: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const lines = wrapText({ text: p, font, fontSize, maxWidth });
    out.push(...lines);
    if (i < paragraphs.length - 1) out.push(''); // blank line marker
  }
  return out;
}

export function wrapText({
  text,
  font,
  fontSize,
  maxWidth,
}: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
}): string[] {
  const normalized = normalizePdfText(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let cur = '';

  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      cur = candidate;
      continue;
    }
    if (cur) lines.push(cur);

    // hard-break long word
    if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
      let chunk = '';
      for (const ch of w) {
        const cand2 = chunk + ch;
        if (font.widthOfTextAtSize(cand2, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = cand2;
        }
      }
      cur = chunk;
    } else {
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function truncateToLines({
  text,
  font,
  fontSize,
  maxWidth,
  maxLines,
  preserveParagraphs = false,
}: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
  maxLines: number;
  preserveParagraphs?: boolean;
}): string {
  const lines = preserveParagraphs
    ? wrapParagraphs({ text, font, fontSize, maxWidth })
    : wrapText({ text, font, fontSize, maxWidth });

  const realLines = lines; // may include "" paragraph separators

  // Count visible lines ("" still consumes vertical space)
  if (realLines.length <= maxLines) {
    return realLines.join('\n');
  }

  const sliced = realLines.slice(0, maxLines);
  // If last visible line is blank, replace it with ellipsis line (more stable)
  if (sliced[maxLines - 1] === '') {
    sliced[maxLines - 1] = '...';
    return sliced.join('\n');
  }

  // Ellipsis on last line
  const last = sliced[maxLines - 1];
  let trimmed = last;
  while (font.widthOfTextAtSize(trimmed + '...', fontSize) > maxWidth && trimmed.length > 0) {
    trimmed = trimmed.slice(0, -1);
  }
  sliced[maxLines - 1] = trimmed + '...';
  return sliced.join('\n');
}

export function drawTextLines({
  page,
  x,
  y,
  lines,
  font,
  fontSize,
  color,
  lineHeight,
  maxLines,
}: {
  page: PDFPage;
  x: number;
  y: number;
  lines: string[];
  font: PDFFont;
  fontSize: number;
  color: RGB;
  lineHeight: number;
  maxLines?: number;
}): number {
  const capped = typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines;
  let yy = y;
  for (const ln of capped) {
    if (ln === '') {
      yy -= lineHeight; // paragraph break
      continue;
    }
    const safe = normalizePdfText(ln);
    page.drawText(safe, { x, y: yy, size: fontSize, font, color });
    yy -= lineHeight;
  }
  return capped.length * lineHeight;
}

export function drawCenteredText({
  page,
  text,
  x,
  y,
  width,
  size,
  font,
  color,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  font: PDFFont;
  color: RGB;
}) {
  const textWidth = font.widthOfTextAtSize(text, size);
  const centeredX = x + (width - textWidth) / 2;
  page.drawText(text, { x: centeredX, y, size, font, color });
}


export function drawRule({
  page,
  x,
  y,
  width,
  thickness,
  color,
  opacity = 1,
}: {
  page: PDFPage;
  x: number;
  y: number;
  width: number;
  thickness: number;
  color: RGB;
  opacity?: number;
}) {
  page.drawRectangle({ x, y, width, height: thickness, color, opacity });
}


/**
 * Stable cursor helper for vertical layout (no page-breaking here; we clamp/truncate instead).
 */
export class Cursor {
  y: number;
  readonly minY: number;
  constructor(startY: number, minY: number) {
    this.y = startY;
    this.minY = minY;
  }
  down(px: number) {
    this.y -= px;
    return this.y;
  }
  canFit(px: number) {
    return this.y - px >= this.minY;
  }
  clampMin() {
    if (this.y < this.minY) this.y = this.minY;
    return this.y;
  }
}

export function drawVRule({
  page,
  x,
  y,
  height,
  thickness,
  color,
  opacity = 1,
}: {
  page: PDFPage;
  x: number;
  y: number;
  height: number;
  thickness: number;
  color: RGB;
  opacity?: number;
}) {
  page.drawRectangle({ x, y, width: thickness, height, color, opacity });
}

/**
 * 12-col Swiss grid overlay (static, very subtle)
 * Drawn within the content band (margin..margin+contentWidth), across full page height.
 */
export function drawGridOverlay(page: PDFPage) {
  const cols = PdfMotifs.gridCols;
  const x0 = PdfLayout.margin;
  const x1 = PdfLayout.margin + PdfLayout.contentWidth;
  const w = x1 - x0;
  const step = w / cols;

  // include both edges like your site (left+right borders)
  for (let i = 0; i <= cols; i++) {
    const x = x0 + step * i;
    drawVRule({
      page,
      x,
      y: 0,
      height: PdfLayout.pageHeight,
      thickness: PdfMotifs.gridThickness,
      color: PdfMotifs.gridColor,
      opacity: PdfMotifs.gridOpacity,
    });
  }
}

/**
 * “Instrument” micro-block: black slab + hairlines + red signal dots + plus
 * (matches your hero black block language, but static)
 */
export function drawInstrumentMark({
  page,
  x,
  y,
  font,
}: {
  page: PDFPage;
  x: number;
  y: number;
  font: PDFFont;
}) {
  const { instrument } = PdfMotifs;

  // slab
  page.drawRectangle({
    x,
    y,
    width: instrument.w,
    height: instrument.h,
    color: instrument.bg,
  });

  // plus (top-right-ish)
  page.drawText('+', {
    x: x + instrument.w - 18,
    y: y + 4,
    size: 14,
    font,
    color: instrument.line,
    opacity: instrument.plusOpacity,
  });

  // hairlines
  page.drawRectangle({
    x: x + 10,
    y: y + 6,
    width: 58,
    height: 1,
    color: instrument.line,
    opacity: instrument.lineOpacity,
  });
  page.drawRectangle({
    x: x + 28,
    y: y + 2,
    width: 1,
    height: 16,
    color: instrument.line,
    opacity: instrument.lineOpacity,
  });
  page.drawRectangle({
    x: x + instrument.w - 34,
    y: y + 2,
    width: 1,
    height: 16,
    color: instrument.line,
    opacity: instrument.lineOpacity,
  });

  // red signal dots
  page.drawCircle({
    x: x + 8,
    y: y + instrument.h / 2,
    size: 2.5,
    color: instrument.dot,
    opacity: instrument.dotOpacity,
  });
  page.drawCircle({
    x: x + instrument.w - 10,
    y: y + 6,
    size: 2.5,
    color: instrument.dot,
    opacity: instrument.dotOpacity,
  });
}

/**
 * Bottom motif: 3 hairlines of varying widths with red dots on the right edge.
 */
export function drawSectionMotif({
  page,
  x,
  y,
  width,
}: {
  page: PDFPage;
  x: number;
  y: number;
  width: number;
}) {
  const t = PdfMotifs.motif.lineThickness;
  const dot = PdfMotifs.motif.dotSize;

  const w1 = width;
  const w2 = width * 0.78;
  const w3 = width * 0.92;

  // line 1
  drawRule({ page, x, y, width: w1, thickness: t, color: PdfColors.textPrimary });
  page.drawCircle({ x: x + w1, y: y + t / 2, size: dot / 2, color: PdfColors.accent });

  // line 2
  drawRule({ page, x, y: y - 10, width: w2, thickness: t, color: PdfColors.textPrimary });
  page.drawCircle({ x: x + w2, y: y - 10 + t / 2, size: dot / 2, color: PdfColors.accent });

  // line 3
  drawRule({ page, x, y: y - 20, width: w3, thickness: t, color: PdfColors.textPrimary });
  page.drawCircle({ x: x + w3, y: y - 20 + t / 2, size: dot / 2, color: PdfColors.accent });
}
