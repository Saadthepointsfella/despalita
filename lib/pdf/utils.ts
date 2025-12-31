import type { PDFFont, PDFPage, RGB } from 'pdf-lib';
import { PdfTypography } from './theme';

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
    // If a single word is too long, hard-break it.
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

export function truncateText({
  text,
  font,
  fontSize,
  maxWidth,
  maxLines,
}: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
  maxLines: number;
}): string {
  const lines = wrapText({ text, font, fontSize, maxWidth });
  if (lines.length <= maxLines) return lines.join(' ');
  const truncated = lines.slice(0, maxLines);
  const lastLine = truncated[maxLines - 1];
  // Add ellipsis if truncated
  const ellipsisWidth = font.widthOfTextAtSize('...', fontSize);
  let trimmed = lastLine;
  while (font.widthOfTextAtSize(trimmed + '...', fontSize) > maxWidth && trimmed.length > 0) {
    trimmed = trimmed.slice(0, -1);
  }
  truncated[maxLines - 1] = trimmed + '...';
  return truncated.join(' ');
}

export function drawTextBlock({
  page,
  x,
  y,
  text,
  font,
  fontSize,
  color,
  maxWidth,
  lineHeight,
  maxLines,
}: {
  page: PDFPage;
  x: number;
  y: number;
  text: string;
  font: PDFFont;
  fontSize: number;
  color: RGB;
  maxWidth: number;
  lineHeight: number;
  maxLines?: number;
}): number {
  const lines = wrapText({ text, font, fontSize, maxWidth });
  const capped = typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines;
  let yy = y;
  for (const ln of capped) {
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
