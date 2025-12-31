import type { PDFFont, PDFPage, RGB } from 'pdf-lib';

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
  const raw = (text ?? '').replace(/\r\n/g, '\n');
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
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
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
    page.drawText(ln, { x, y: yy, size: fontSize, font, color });
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
}: {
  page: PDFPage;
  x: number;
  y: number;
  width: number;
  thickness: number;
  color: RGB;
}) {
  page.drawRectangle({ x, y, width, height: thickness, color });
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
