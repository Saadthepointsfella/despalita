import type { PDFFont, PDFPage, RGB } from 'pdf-lib';

/**
 * Typography primitives for PDF generation.
 * These functions handle text wrapping, height accounting, and proper line spacing.
 * Use these instead of manual "y -= fontSize" calculations.
 */

export type TextStyle = {
  font: PDFFont;
  size: number;
  color: RGB;
  lineHeight: number;      // Absolute pixels between baselines
  paragraphGap?: number;   // Extra space after paragraph (optional)
};

export type TextAlign = 'left' | 'center' | 'right';

/**
 * Wrap text to fit within maxWidth, returning array of lines.
 * Handles long words by breaking them if necessary.
 */
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
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);

    if (width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    // Push current line if we have one
    if (currentLine) {
      lines.push(currentLine);
    }

    // Handle long words that exceed maxWidth on their own
    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      const brokenParts = breakLongWord(word, font, fontSize, maxWidth);
      // Add all parts except the last as complete lines
      for (let i = 0; i < brokenParts.length - 1; i++) {
        lines.push(brokenParts[i]);
      }
      // Keep the last part as the current line
      currentLine = brokenParts[brokenParts.length - 1] || '';
    } else {
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Break a single long word into chunks that fit within maxWidth.
 */
function breakLongWord(
  word: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const parts: string[] = [];
  let chunk = '';

  for (const char of word) {
    const candidate = chunk + char;
    if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && chunk) {
      parts.push(chunk);
      chunk = char;
    } else {
      chunk = candidate;
    }
  }

  if (chunk) {
    parts.push(chunk);
  }

  return parts;
}

/**
 * Wrap text into paragraphs, preserving explicit paragraph breaks.
 * Single newlines act as spaces; blank lines separate paragraphs.
 * Returns array of lines where '' indicates a paragraph break.
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
    .split(/\n\s*\n/g) // blank line = paragraph break
    .map(p => p.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const out: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const lines = wrapText({ text: p, font, fontSize, maxWidth });
    out.push(...lines);
    if (i < paragraphs.length - 1) {
      out.push(''); // blank line marker for paragraph break
    }
  }
  return out;
}

/**
 * Calculate the height that a block of text will occupy.
 */
export function measureTextHeight({
  lines,
  lineHeight,
  paragraphGap = 0,
}: {
  lines: string[];
  lineHeight: number;
  paragraphGap?: number;
}): number {
  let height = 0;
  for (const line of lines) {
    if (line === '') {
      // Paragraph break
      height += paragraphGap || lineHeight;
    } else {
      height += lineHeight;
    }
  }
  return height;
}

/**
 * Draw a paragraph of text, handling wrapping and returning the new y position.
 * This is the primary primitive for drawing text blocks.
 */
export function drawParagraph({
  page,
  text,
  x,
  y,
  maxWidth,
  style,
  align = 'left',
  maxLines,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  style: TextStyle;
  align?: TextAlign;
  maxLines?: number;
}): number {
  const lines = wrapParagraphs({
    text,
    font: style.font,
    fontSize: style.size,
    maxWidth,
  });

  const cappedLines = maxLines !== undefined ? lines.slice(0, maxLines) : lines;
  const paragraphGap = style.paragraphGap ?? style.lineHeight;

  let currentY = y;

  for (let i = 0; i < cappedLines.length; i++) {
    const line = cappedLines[i];

    if (line === '') {
      // Paragraph break - add extra space
      currentY -= paragraphGap;
      continue;
    }

    // Calculate x position based on alignment
    let drawX = x;
    if (align === 'center') {
      const textWidth = style.font.widthOfTextAtSize(line, style.size);
      drawX = x + (maxWidth - textWidth) / 2;
    } else if (align === 'right') {
      const textWidth = style.font.widthOfTextAtSize(line, style.size);
      drawX = x + maxWidth - textWidth;
    }

    // Handle truncation with ellipsis on last line if maxLines is set
    let displayLine = line;
    if (maxLines !== undefined && i === maxLines - 1 && lines.length > maxLines) {
      displayLine = truncateWithEllipsis(line, style.font, style.size, maxWidth);
    }

    page.drawText(displayLine, {
      x: drawX,
      y: currentY,
      size: style.size,
      font: style.font,
      color: style.color,
    });

    currentY -= style.lineHeight;
  }

  return currentY;
}

/**
 * Draw a simple text block (no paragraph handling, just line-by-line).
 * Useful when you already have pre-wrapped lines.
 */
export function drawLines({
  page,
  lines,
  x,
  y,
  style,
  align = 'left',
  maxWidth,
}: {
  page: PDFPage;
  lines: string[];
  x: number;
  y: number;
  style: TextStyle;
  align?: TextAlign;
  maxWidth?: number;
}): number {
  let currentY = y;
  const paragraphGap = style.paragraphGap ?? style.lineHeight;

  for (const line of lines) {
    if (line === '') {
      currentY -= paragraphGap;
      continue;
    }

    let drawX = x;
    if (align !== 'left' && maxWidth) {
      const textWidth = style.font.widthOfTextAtSize(line, style.size);
      if (align === 'center') {
        drawX = x + (maxWidth - textWidth) / 2;
      } else if (align === 'right') {
        drawX = x + maxWidth - textWidth;
      }
    }

    page.drawText(line, {
      x: drawX,
      y: currentY,
      size: style.size,
      font: style.font,
      color: style.color,
    });

    currentY -= style.lineHeight;
  }

  return currentY;
}

/**
 * Draw a list with bullets or checkboxes, returning new y position.
 */
export function drawList({
  page,
  items,
  x,
  y,
  maxWidth,
  style,
  bullet = '–',
  indent = 12,
  itemSpacing = 0,
  maxItems,
}: {
  page: PDFPage;
  items: string[];
  x: number;
  y: number;
  maxWidth: number;
  style: TextStyle;
  bullet?: string;          // e.g., '–', '•', '[ ]', '1.'
  indent?: number;          // Space after bullet
  itemSpacing?: number;     // Extra space between items
  maxItems?: number;
}): number {
  const cappedItems = maxItems !== undefined ? items.slice(0, maxItems) : items;
  let currentY = y;

  const bulletWidth = style.font.widthOfTextAtSize(bullet + ' ', style.size);
  const textMaxWidth = maxWidth - bulletWidth - indent;

  for (let i = 0; i < cappedItems.length; i++) {
    const item = cappedItems[i];
    const lines = wrapText({
      text: item,
      font: style.font,
      fontSize: style.size,
      maxWidth: textMaxWidth,
    });

    // Draw bullet on first line
    page.drawText(bullet, {
      x,
      y: currentY,
      size: style.size,
      font: style.font,
      color: style.color,
    });

    // Draw text lines
    for (let j = 0; j < lines.length; j++) {
      page.drawText(lines[j], {
        x: x + bulletWidth + (j === 0 ? 0 : indent - bulletWidth),
        y: currentY,
        size: style.size,
        font: style.font,
        color: style.color,
      });
      currentY -= style.lineHeight;
    }

    // Add item spacing (except after last item)
    if (i < cappedItems.length - 1 && itemSpacing > 0) {
      currentY -= itemSpacing;
    }
  }

  return currentY;
}

/**
 * Draw a checklist (list with checkbox bullets).
 */
export function drawChecklist({
  page,
  items,
  x,
  y,
  maxWidth,
  style,
  itemSpacing = 0,
  maxItems,
}: {
  page: PDFPage;
  items: string[];
  x: number;
  y: number;
  maxWidth: number;
  style: TextStyle;
  itemSpacing?: number;
  maxItems?: number;
}): number {
  return drawList({
    page,
    items,
    x,
    y,
    maxWidth,
    style,
    bullet: '[ ]',
    indent: 16,
    itemSpacing,
    maxItems,
  });
}

/**
 * Truncate text to fit within maxWidth, adding ellipsis.
 */
function truncateWithEllipsis(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string {
  const ellipsis = '...';
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (
    truncated.length > 0 &&
    font.widthOfTextAtSize(truncated + ellipsis, fontSize) > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + ellipsis;
}

/**
 * Truncate multi-line text to a maximum number of lines, with ellipsis on last line.
 */
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

  if (lines.length <= maxLines) {
    return lines.join('\n');
  }

  const sliced = lines.slice(0, maxLines);

  // If last line is a paragraph break, replace with ellipsis
  if (sliced[maxLines - 1] === '') {
    sliced[maxLines - 1] = '...';
    return sliced.join('\n');
  }

  // Add ellipsis to last line
  const lastLine = sliced[maxLines - 1];
  sliced[maxLines - 1] = truncateWithEllipsis(
    lastLine,
    font,
    fontSize,
    maxWidth
  );

  return sliced.join('\n');
}

/**
 * Draw centered text within a given width.
 */
export function drawCenteredText({
  page,
  text,
  x,
  y,
  width,
  style,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  width: number;
  style: TextStyle;
}): void {
  const textWidth = style.font.widthOfTextAtSize(text, style.size);
  const centeredX = x + (width - textWidth) / 2;
  page.drawText(text, {
    x: centeredX,
    y,
    size: style.size,
    font: style.font,
    color: style.color,
  });
}

/**
 * Draw a horizontal rule.
 */
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
}): void {
  page.drawRectangle({ x, y, width, height: thickness, color });
}
