import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { ResultsDTO } from '@/lib/results/types';
import { env } from '@/env';

/**
 * Generate a PDF report from assessment results.
 * Uses pdf-lib for server-side PDF generation.
 */
export async function generatePdf(dto: ResultsDTO): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Colors
  const fg = rgb(0.12, 0.11, 0.1);
  const muted = rgb(0.45, 0.43, 0.42);
  const accent = rgb(0.9, 0.35, 0.15);

  // Page setup
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Helper for drawing text
  const drawText = (
    text: string,
    options: {
      x?: number;
      y?: number;
      font?: typeof helvetica;
      size?: number;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) => {
    const {
      x = margin,
      y: yPos = y,
      font = helvetica,
      size = 10,
      color = fg,
    } = options;
    page.drawText(text, { x, y: yPos, font, size, color });
  };

  // Header
  drawText('MaxMin DTC Assessment Report', {
    font: helveticaBold,
    size: 20,
    color: fg,
  });
  y -= 30;

  // Company and date
  if (dto.company) {
    drawText(dto.company, {
      font: helveticaBold,
      size: 14,
      color: fg,
    });
    y -= 20;
  }
  drawText(`Generated: ${new Date(dto.created_at).toLocaleDateString()}`, {
    size: 10,
    color: muted,
  });
  y -= 40;

  // Overall score section
  drawText('OVERALL SCORE', { font: helveticaBold, size: 12, color: accent });
  y -= 20;

  const levelLabels: Record<number, string> = {
    1: 'Foundation',
    2: 'Developing',
    3: 'Established',
    4: 'Advanced',
    5: 'Optimized',
  };

  const levelNum = dto.overall.level.level;
  drawText(`Score: ${dto.overall.score_capped.toFixed(1)} / 5.0`, {
    font: helveticaBold,
    size: 16,
  });
  y -= 20;
  drawText(`Level ${levelNum}: ${levelLabels[levelNum] || 'Unknown'}`, {
    size: 12,
    color: muted,
  });
  y -= 40;

  // Dimension scores
  drawText('DIMENSION SCORES', { font: helveticaBold, size: 12, color: accent });
  y -= 25;

  for (const dim of dto.dimensions) {
    const tierLabel = dim.tier === 'low' ? 'Low' : dim.tier === 'medium' ? 'Medium' : 'High';
    const flags: string[] = [];
    if (dim.is_primary_gap) flags.push('Primary Gap');
    if (dim.is_critical_gap) flags.push('Critical');

    drawText(`${dim.short_label} - ${dim.name}`, {
      font: helveticaBold,
      size: 10,
    });
    y -= 15;

    const detailText = `Score: ${dim.score.toFixed(2)} | Tier: ${tierLabel}${flags.length ? ` | ${flags.join(', ')}` : ''}`;
    drawText(detailText, { size: 9, color: muted });
    y -= 20;

    // Check if we need a new page
    if (y < margin + 100) {
      const newPage = doc.addPage([595, 842]);
      y = newPage.getHeight() - margin;
    }
  }

  y -= 20;

  // Roadmap section
  if (dto.roadmap.length > 0) {
    // Check if we need a new page
    if (y < margin + 200) {
      const newPage = doc.addPage([595, 842]);
      y = newPage.getHeight() - margin;
    }

    const currentPage = doc.getPage(doc.getPageCount() - 1);

    currentPage.drawText('PRIORITY ROADMAP', {
      x: margin,
      y,
      font: helveticaBold,
      size: 12,
      color: accent,
    });
    y -= 25;

    for (const module of dto.roadmap.slice(0, 3)) {
      currentPage.drawText(`${module.dimension_id} (${module.tier.toUpperCase()})`, {
        x: margin,
        y,
        font: helveticaBold,
        size: 10,
        color: fg,
      });
      y -= 15;

      // What it means (truncated)
      const whatItMeans = module.what_it_means.slice(0, 100) + (module.what_it_means.length > 100 ? '...' : '');
      currentPage.drawText(whatItMeans, {
        x: margin,
        y,
        font: helvetica,
        size: 9,
        color: muted,
      });
      y -= 20;

      // Now actions
      if (module.now.length > 0) {
        currentPage.drawText('Now:', {
          x: margin + 10,
          y,
          font: helveticaBold,
          size: 9,
          color: fg,
        });
        y -= 12;
        for (const item of module.now.slice(0, 2)) {
          const truncatedItem = item.slice(0, 80) + (item.length > 80 ? '...' : '');
          currentPage.drawText(`• ${truncatedItem}`, {
            x: margin + 20,
            y,
            font: helvetica,
            size: 8,
            color: muted,
          });
          y -= 11;
        }
      }

      y -= 15;

      // Check for page break
      if (y < margin + 80) {
        const newPage = doc.addPage([595, 842]);
        y = newPage.getHeight() - margin;
      }
    }
  }

  // Footer
  const footerPage = doc.getPage(doc.getPageCount() - 1);
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  footerPage.drawText(`View full results: ${siteUrl}/results/${dto.token}`, {
    x: margin,
    y: margin,
    font: helvetica,
    size: 8,
    color: muted,
  });

  footerPage.drawText('maxmin.co', {
    x: width - margin - 50,
    y: margin,
    font: helvetica,
    size: 8,
    color: muted,
  });

  return doc.save();
}
