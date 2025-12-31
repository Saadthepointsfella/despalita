import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { ResultsDTO, PdfData } from '@/lib/results/getResultsForPdf';
import { PdfColors, PdfLayout, PdfTypography, getLevelColor } from './theme';
import { clamp, drawCenteredText, drawTextBlock, truncateText, wrapText } from './utils';
import {
  getAnswerObservation,
  getBenchmarkForTransition,
  getImpact,
  getToolRecommendations,
  getDependencyAlerts,
} from './content/lookups';
import type { Tier } from './content/types';
import type { PdfDetailPacks } from './content/loadPacks';
import { generateNextStepsPlan } from './nextSteps';

export type PdfAnswerContext = {
  answers: Array<{ question_id: string; option_id: string; dimension_id: string }>;
};

type Gap = {
  dimension_id: string;
  order: number;
  section: string;
  name: string;
  short_label: string;
  score: number;
  tier: Tier;
  is_primary_gap: boolean;
};

function sortDimsByScore(results: ResultsDTO) {
  return [...results.dimensions].sort((a, b) => (a.score - b.score) || (a.order - b.order));
}

function topGaps(results: ResultsDTO, n = 3): Gap[] {
  return sortDimsByScore(results)
    .slice(0, n)
    .map((d) => ({
      dimension_id: d.dimension_id,
      order: d.order,
      section: d.section,
      name: d.name,
      short_label: d.short_label,
      score: d.score,
      tier: d.tier as Tier,
      is_primary_gap: d.is_primary_gap,
    }));
}

function scoreLabel(score: number) {
  return `${Math.round(score * 10) / 10}/5`;
}

function fillPageBg(page: any) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PdfLayout.pageWidth,
    height: PdfLayout.pageHeight,
    color: PdfColors.pageBg,
  });
}

function drawHeaderFooter({
  page,
  helveticaBold,
  helvetica,
  pageIndex,
  pageCount,
  createdAtISO,
  company,
}: {
  page: any;
  helveticaBold: any;
  helvetica: any;
  pageIndex: number;
  pageCount: number;
  createdAtISO: string;
  company?: string | null;
}) {
  const { margin, contentWidth, pageHeight } = PdfLayout;
  const topY = pageHeight - margin;

  // Header
  const headerY = topY + 10;
  const left = company ? `MAXMIN - ${company}` : 'MAXMIN';
  page.drawText(left, {
    x: margin,
    y: headerY,
    size: PdfTypography.micro,
    font: helveticaBold,
    color: PdfColors.textBody,
  });

  const date = new Date(createdAtISO);
  const dateLabel = isNaN(date.getTime()) ? createdAtISO : date.toLocaleDateString();
  const dateW = helvetica.widthOfTextAtSize(dateLabel, PdfTypography.micro);
  page.drawText(dateLabel, {
    x: margin + contentWidth - dateW,
    y: headerY,
    size: PdfTypography.micro,
    font: helvetica,
    color: PdfColors.textMuted,
  });

  // Header divider
  page.drawLine({
    start: { x: margin, y: headerY - 8 },
    end: { x: margin + contentWidth, y: headerY - 8 },
    thickness: 1,
    color: PdfColors.border,
  });

  // Footer
  const footerY = margin - 18;
  page.drawLine({
    start: { x: margin, y: footerY + 10 },
    end: { x: margin + contentWidth, y: footerY + 10 },
    thickness: 1,
    color: PdfColors.border,
  });

  page.drawText('maxmin.agency', {
    x: margin,
    y: footerY,
    size: PdfTypography.caption,
    font: helvetica,
    color: PdfColors.textMuted,
  });
  const pageLabel = `Page ${pageIndex + 1} of ${pageCount}`;
  const pW = helvetica.widthOfTextAtSize(pageLabel, PdfTypography.caption);
  page.drawText(pageLabel, {
    x: margin + contentWidth - pW,
    y: footerY,
    size: PdfTypography.caption,
    font: helvetica,
    color: PdfColors.textMuted,
  });
}

function drawSectionHeader({ page, x, y, num, title, helveticaBold }: { page: any; x: number; y: number; num: string; title: string; helveticaBold: any }) {
  page.drawText(num, {
    x,
    y,
    size: PdfTypography.body,
    font: helveticaBold,
    color: PdfColors.textMuted,
  });
  page.drawText(title.toUpperCase(), {
    x: x + 26,
    y,
    size: PdfTypography.sectionHeader,
    font: helveticaBold,
    color: PdfColors.textPrimary,
  });
}

function drawCallout({
  page,
  x,
  y,
  w,
  title,
  subtitle,
  body,
  accent,
  helveticaBold,
  helvetica,
}: {
  page: any;
  x: number;
  y: number;
  w: number;
  title: string;
  subtitle: string;
  body: string;
  accent: any;
  helveticaBold: any;
  helvetica: any;
}) {
  const padding = 12;
  const titleSize = PdfTypography.caption;
  const subtitleSize = PdfTypography.bodyLarge;
  const bodySize = PdfTypography.body;
  const lineHeight = bodySize * PdfTypography.lineHeightNormal;

  const bodyLines = wrapText({ text: body, font: helvetica, fontSize: bodySize, maxWidth: w - padding * 2 });
  const boxH = padding + titleSize + 6 + subtitleSize + 8 + bodyLines.length * lineHeight + padding;

  page.drawRectangle({ x, y: y - boxH, width: w, height: boxH, color: PdfColors.cardBg, borderColor: PdfColors.border, borderWidth: 1 });
  // Left accent line
  page.drawRectangle({ x, y: y - boxH, width: 3, height: boxH, color: accent });

  let cy = y - padding - titleSize;
  page.drawText(title.toUpperCase(), {
    x: x + padding,
    y: cy,
    size: titleSize,
    font: helveticaBold,
    color: accent,
  });
  cy -= 6 + subtitleSize;
  page.drawText(subtitle, {
    x: x + padding,
    y: cy,
    size: subtitleSize,
    font: helveticaBold,
    color: PdfColors.textPrimary,
  });
  cy -= 8;
  for (const line of bodyLines) {
    page.drawText(line, {
      x: x + padding,
      y: cy,
      size: bodySize,
      font: helvetica,
      color: PdfColors.textBody,
    });
    cy -= lineHeight;
  }

  return boxH;
}

function drawScoreBar({
  page,
  x,
  y,
  score,
  width,
}: {
  page: any;
  x: number;
  y: number;
  score: number;
  width: number;
}) {
  const h = 2; // thin bar
  const fillW = (clamp(score, 0, 5) / 5) * width;
  page.drawRectangle({ x, y, width, height: h, color: PdfColors.border });
  page.drawRectangle({ x, y, width: fillW, height: h, color: PdfColors.textPrimary });
}

function drawMiniRadar({
  page,
  cx,
  cy,
  radius,
  scores,
  accent,
}: {
  page: any;
  cx: number;
  cy: number;
  radius: number;
  scores: number[];
  accent: any;
}) {
  const n = scores.length;
  // grid rings
  for (let r = 1; r <= 5; r += 2) {
    const rr = (r / 5) * radius;
    const pts = [] as { x: number; y: number }[];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      page.drawLine({ start: p1, end: p2, thickness: 0.5, color: PdfColors.border });
    }
  }
  // polygon
  const poly = [] as { x: number; y: number }[];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (clamp(scores[i] ?? 0, 0, 5) / 5) * radius;
    poly.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  for (let i = 0; i < n; i++) {
    page.drawLine({ start: poly[i], end: poly[(i + 1) % n], thickness: 1, color: accent });
  }
}

export async function generateConsultantPdf({
  data,
  packs,
  baseUrl,
}: {
  data: PdfData;
  packs: PdfDetailPacks;
  baseUrl: string;
}): Promise<Uint8Array> {
  const { results, company, answers } = data;

  // Build answers with dimension_id for observations lookup
  const answerContext: PdfAnswerContext = {
    answers: answers.map(a => ({
      question_id: a.question_id,
      option_id: a.option_id,
      dimension_id: a.dimension_id ?? '',
    })),
  };

  const pdf = await PDFDocument.create();
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdf.embedFont(StandardFonts.Courier);

  const level = results.overall.level.level;
  const levelColor = getLevelColor(level);

  const gaps = topGaps(results, 3);
  const pageCount = 6; // fixed: 1 summary + 1 scorecard + 3 gaps + 1 next steps

  // -----------------
  // Page 1: Executive Summary
  // -----------------
  {
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    fillPageBg(page);

    const { margin, contentWidth, pageHeight } = PdfLayout;
    let y = pageHeight - margin - 40;

    // Level hero
    const hero = results.overall.level;
    drawCenteredText({
      page,
      text: hero.name.toUpperCase(),
      x: margin,
      y,
      width: contentWidth,
      size: PdfTypography.heroTitle,
      font: helveticaBold,
      color: levelColor,
    });
    y -= PdfTypography.heroTitle + 12;
    drawCenteredText({
      page,
      text: scoreLabel(results.overall.score_capped),
      x: margin,
      y,
      width: contentWidth,
      size: PdfTypography.pageTitle,
      font: courier,
      color: PdfColors.textPrimary,
    });

    y -= PdfTypography.pageTitle + 18;
    const tagline = truncateText({
      text: hero.hero_title,
      font: helvetica,
      fontSize: PdfTypography.bodyLarge,
      maxWidth: contentWidth,
      maxLines: 2,
    });
    drawTextBlock({
      page,
      text: tagline,
      x: margin,
      y,
      maxWidth: contentWidth,
      font: helvetica,
      fontSize: PdfTypography.bodyLarge,
      color: PdfColors.textBody,
      lineHeight: PdfTypography.bodyLarge * PdfTypography.lineHeightNormal,
    });
    y -= 52;

    // Section 01
    drawSectionHeader({ page, x: margin, y, num: '01', title: 'Summary', helveticaBold });
    y -= 28;

    // Hero copy (clamped)
    const heroCopy = truncateText({
      text: hero.hero_copy,
      font: helvetica,
      fontSize: PdfTypography.body,
      maxWidth: contentWidth,
      maxLines: 4,
    });
    const used = drawTextBlock({
      page,
      text: heroCopy,
      x: margin,
      y,
      maxWidth: contentWidth,
      font: helvetica,
      fontSize: PdfTypography.body,
      color: PdfColors.textBody,
      lineHeight: PdfTypography.body * PdfTypography.lineHeightRelaxed,
    });
    y -= used + 18;

    const primary = results.dimensions.find((d) => d.dimension_id === results.primary_gap.dimension_id);
    const primaryName = primary?.name ?? results.primary_gap.dimension_id;
    const primaryScore = primary?.score ?? results.primary_gap.score;

    const primaryObs = (() => {
      const candidates = answerContext.answers
        .filter((a) => a.dimension_id === results.primary_gap.dimension_id)
        .map((a) => getAnswerObservation(packs.observations, a.question_id, a.option_id))
        .filter(Boolean) as any[];
      return candidates[0]?.summary ?? 'Primary gap identified based on your answers across this dimension.';
    })();

    const calloutH = drawCallout({
      page,
      x: margin,
      y,
      w: contentWidth,
      title: 'Primary Gap',
      subtitle: `${primaryName} - ${Math.round(primaryScore * 10) / 10}/5`,
      body: primaryObs,
      accent: levelColor,
      helveticaBold,
      helvetica,
    });
    y -= calloutH + 16;

    // Dependency alerts
    const depAlerts = getDependencyAlerts(packs.dependencies, results);
    if (depAlerts.length) {
      const alert = depAlerts[0];
      drawCallout({
        page,
        x: margin,
        y,
        w: contentWidth,
        title: 'Dependency Alert',
        subtitle: alert.title,
        body: alert.message,
        accent: PdfColors.level1,
        helveticaBold,
        helvetica,
      });
    }

    drawHeaderFooter({
      page,
      helveticaBold,
      helvetica,
      pageIndex: 0,
      pageCount,
      createdAtISO: results.created_at,
      company,
    });
  }

  // -----------------
  // Page 2: Dimension scorecard + mini radar
  // -----------------
  {
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    fillPageBg(page);
    const { margin, contentWidth, pageHeight } = PdfLayout;
    let y = pageHeight - margin - 60;

    drawSectionHeader({ page, x: margin, y, num: '02', title: 'Dimension Scores', helveticaBold });
    y -= 30;

    // mini radar in top-right
    const scores = [...results.dimensions]
      .sort((a, b) => a.order - b.order)
      .map((d) => d.score);
    drawMiniRadar({
      page,
      cx: margin + contentWidth - 80,
      cy: y + 28,
      radius: 38,
      scores,
      accent: levelColor,
    });

    for (const d of [...results.dimensions].sort((a, b) => a.order - b.order)) {
      const isPrimary = d.is_primary_gap;
      const rowTop = y;
      // title row
      page.drawText(`${d.section}  ${d.name}`, {
        x: margin,
        y: rowTop,
        size: PdfTypography.bodyLarge,
        font: helveticaBold,
        color: PdfColors.textPrimary,
      });

      const scoreTxt = `${Math.round(d.score * 10) / 10}`;
      const sW = courier.widthOfTextAtSize(scoreTxt, PdfTypography.bodyLarge);
      page.drawText(scoreTxt, {
        x: margin + contentWidth - sW,
        y: rowTop,
        size: PdfTypography.bodyLarge,
        font: courier,
        color: PdfColors.textPrimary,
      });

      // primary badge (using ASCII instead of diamond)
      if (isPrimary) {
        const badge = '>> PRIMARY GAP';
        const bW = helvetica.widthOfTextAtSize(badge, PdfTypography.caption);
        page.drawText(badge, {
          x: margin + contentWidth - sW - 12 - bW,
          y: rowTop + 1,
          size: PdfTypography.caption,
          font: helveticaBold,
          color: levelColor,
        });
      }

      // bar
      y -= 16;
      drawScoreBar({ page, x: margin, y, score: d.score, width: contentWidth * 0.72 });
      page.drawText(d.tier, {
        x: margin + contentWidth * 0.75,
        y: y - 4,
        size: PdfTypography.caption,
        font: helvetica,
        color: PdfColors.textMuted,
      });
      y -= 18;

      // thin divider
      page.drawLine({
        start: { x: margin, y },
        end: { x: margin + contentWidth, y },
        thickness: 0.75,
        color: PdfColors.border,
      });
      y -= 18;
    }

    drawHeaderFooter({
      page,
      helveticaBold,
      helvetica,
      pageIndex: 1,
      pageCount,
      createdAtISO: results.created_at,
      company,
    });
  }

  // -----------------
  // Pages 3-5: Gap deep dives (consultant-style)
  // -----------------
  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i];
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    fillPageBg(page);
    const { margin, contentWidth, pageHeight } = PdfLayout;
    let y = pageHeight - margin - 60;

    const num = `0${3 + i}`;
    drawSectionHeader({ page, x: margin, y, num, title: `Priority #${i + 1}: ${gap.name}`, helveticaBold });
    y -= 26;
    page.drawText(`Score: ${scoreLabel(gap.score)} - Tier: ${gap.tier}${gap.is_primary_gap ? ' - Primary Gap' : ''}`, {
      x: margin,
      y,
      size: PdfTypography.body,
      font: helvetica,
      color: PdfColors.textBody,
    });
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: PdfColors.border });
    y -= 22;

    // WHAT YOU TOLD US
    page.drawText('WHAT YOU TOLD US', {
      x: margin,
      y,
      size: PdfTypography.caption,
      font: helveticaBold,
      color: PdfColors.textMuted,
    });
    y -= 14;
    const dimAnswers = answerContext.answers.filter((a) => a.dimension_id === gap.dimension_id);
    const observations = dimAnswers
      .map((a) => getAnswerObservation(packs.observations, a.question_id, a.option_id)?.summary)
      .filter(Boolean) as string[];
    const obsLines = observations.slice(0, 6);
    const bulletSize = PdfTypography.body;
    const bulletLH = bulletSize * PdfTypography.lineHeightRelaxed;
    for (const line of obsLines) {
      const wrapped = wrapText({ text: line, font: helvetica, fontSize: bulletSize, maxWidth: contentWidth - 18 });
      for (const w of wrapped) {
        page.drawText(`- ${w}`, {
          x: margin,
          y,
          size: bulletSize,
          font: helvetica,
          color: PdfColors.textBody,
        });
        y -= bulletLH;
      }
    }
    if (!obsLines.length) {
      page.drawText('- (No observations available for this dimension yet.)', {
        x: margin,
        y,
        size: bulletSize,
        font: helvetica,
        color: PdfColors.textMuted,
      });
      y -= bulletLH;
    }
    y -= 10;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: PdfColors.border });
    y -= 18;

    // WHY THIS MATTERS
    page.drawText('WHY THIS MATTERS', {
      x: margin,
      y,
      size: PdfTypography.caption,
      font: helveticaBold,
      color: PdfColors.textMuted,
    });
    y -= 14;
    const impact = getImpact(packs.impacts, gap.dimension_id, gap.tier);
    if (impact) {
      const headline = impact.headline ?? 'Impact';
      page.drawText(headline, {
        x: margin,
        y,
        size: PdfTypography.bodyLarge,
        font: helveticaBold,
        color: PdfColors.textPrimary,
      });
      y -= 16;

      const impactBody = impact.detail ?? '';
      const impactUsed = drawTextBlock({
        page,
        text: truncateText({ text: impactBody, font: helvetica, fontSize: PdfTypography.body, maxWidth: contentWidth, maxLines: 7 }),
        x: margin,
        y,
        maxWidth: contentWidth,
        font: helvetica,
        fontSize: PdfTypography.body,
        color: PdfColors.textBody,
        lineHeight: PdfTypography.body * PdfTypography.lineHeightRelaxed,
      });
      y -= impactUsed + 8;
    } else {
      page.drawText('(No impact estimate for this dimension/tier yet.)', {
        x: margin,
        y,
        size: PdfTypography.body,
        font: helvetica,
        color: PdfColors.textMuted,
      });
      y -= 14;
    }

    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: PdfColors.border });
    y -= 18;

    // YOUR ROADMAP (from results.roadmap)
    page.drawText('YOUR ROADMAP', {
      x: margin,
      y,
      size: PdfTypography.caption,
      font: helveticaBold,
      color: PdfColors.textMuted,
    });
    y -= 14;
    const rm = results.roadmap.find((r) => r.dimension_id === gap.dimension_id);
    if (rm) {
      const renderChecklist = (label: string, items: string[]) => {
        page.drawText(label.toUpperCase(), {
          x: margin,
          y,
          size: PdfTypography.body,
          font: helveticaBold,
          color: PdfColors.textPrimary,
        });
        y -= 12;
        page.drawLine({ start: { x: margin, y }, end: { x: margin + 160, y }, thickness: 0.75, color: PdfColors.border });
        y -= 10;
        for (const it of items.slice(0, 4)) {
          const wrapped = wrapText({ text: it, font: helvetica, fontSize: PdfTypography.body, maxWidth: contentWidth - 18 });
          for (const w of wrapped) {
            page.drawText(`[ ] ${w}`, {
              x: margin + 12,
              y,
              size: PdfTypography.body,
              font: helvetica,
              color: PdfColors.textBody,
            });
            y -= PdfTypography.body * PdfTypography.lineHeightRelaxed;
          }
        }
        y -= 8;
      };
      renderChecklist('Now (This Week)', rm.now);
      renderChecklist('Next (This Month)', rm.next);
      renderChecklist('Later (This Quarter)', rm.later);

      page.drawText(`Success indicator: ${rm.success_indicator}`, {
        x: margin,
        y,
        size: PdfTypography.caption,
        font: helvetica,
        color: PdfColors.textMuted,
      });
      y -= 14;
    } else {
      page.drawText('(No roadmap module found.)', {
        x: margin,
        y,
        size: PdfTypography.body,
        font: helvetica,
        color: PdfColors.textMuted,
      });
      y -= 14;
    }

    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: PdfColors.border });
    y -= 18;

    // TOOLS TO CONSIDER
    page.drawText('TOOLS TO CONSIDER', {
      x: margin,
      y,
      size: PdfTypography.caption,
      font: helveticaBold,
      color: PdfColors.textMuted,
    });
    y -= 14;
    const tools = getToolRecommendations(packs.tools, gap.dimension_id, gap.tier) ?? [];
    if (tools.length) {
      for (const t of tools.slice(0, 4)) {
        const left = t.name;
        const right = `${t.pricing ?? ''}${t.pricing && t.description ? ' - ' : ''}${t.description ?? ''}`.trim();
        page.drawText(left, {
          x: margin,
          y,
          size: PdfTypography.bodyLarge,
          font: helveticaBold,
          color: PdfColors.textPrimary,
        });
        page.drawText(right, {
          x: margin + 170,
          y,
          size: PdfTypography.body,
          font: helvetica,
          color: PdfColors.textBody,
        });
        y -= 16;
      }
    } else {
      page.drawText('(No tool recommendations for this dimension/tier yet.)', {
        x: margin,
        y,
        size: PdfTypography.body,
        font: helvetica,
        color: PdfColors.textMuted,
      });
      y -= 14;
    }

    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: PdfColors.border });
    y -= 18;

    // WHAT GOOD LOOKS LIKE (next level)
    page.drawText('WHAT GOOD LOOKS LIKE', {
      x: margin,
      y,
      size: PdfTypography.caption,
      font: helveticaBold,
      color: PdfColors.textMuted,
    });
    y -= 14;
    const nextLevel = clamp((results.overall.level.level + 1) as any, 1, 5) as 1 | 2 | 3 | 4 | 5;
    const bench = getBenchmarkForTransition(packs.benchmarks, gap.dimension_id, results.overall.level.level, nextLevel);
    if (bench) {
      const cap = bench.capabilities ?? [];
      const title = `At Level ${nextLevel}, you can:`;
      page.drawText(title, {
        x: margin,
        y,
        size: PdfTypography.bodyLarge,
        font: helveticaBold,
        color: PdfColors.textPrimary,
      });
      y -= 16;
      for (const c of cap.slice(0, 4)) {
        const wrapped = wrapText({ text: c, font: helvetica, fontSize: PdfTypography.body, maxWidth: contentWidth - 18 });
        for (const w of wrapped) {
          page.drawText(`- ${w}`, {
            x: margin,
            y,
            size: PdfTypography.body,
            font: helvetica,
            color: PdfColors.textBody,
          });
          y -= PdfTypography.body * PdfTypography.lineHeightNormal;
        }
      }
      y -= 8;
      if (bench.you_know_you_are_there_when) {
        const yn = truncateText({ text: bench.you_know_you_are_there_when, font: helvetica, fontSize: PdfTypography.body, maxWidth: contentWidth, maxLines: 3 });
        drawTextBlock({
          page,
          text: yn,
          x: margin,
          y,
          maxWidth: contentWidth,
          font: helvetica,
          fontSize: PdfTypography.body,
          color: PdfColors.textBody,
          lineHeight: PdfTypography.body * PdfTypography.lineHeightNormal,
        });
      }
    } else {
      page.drawText('(No benchmark copy for this dimension/transition yet.)', {
        x: margin,
        y,
        size: PdfTypography.body,
        font: helvetica,
        color: PdfColors.textMuted,
      });
      y -= 14;
    }

    drawHeaderFooter({
      page,
      helveticaBold,
      helvetica,
      pageIndex: 2 + i,
      pageCount,
      createdAtISO: results.created_at,
      company,
    });
  }

  // -----------------
  // Page 6: Next Steps + CTA
  // -----------------
  {
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    fillPageBg(page);
    const { margin, contentWidth, pageHeight } = PdfLayout;
    let y = pageHeight - margin - 60;

    drawSectionHeader({ page, x: margin, y, num: '06', title: 'Next Steps', helveticaBold });
    y -= 30;

    const plan = generateNextStepsPlan(results, packs.nextSteps);

    const renderBlock = (title: string, items: string[]) => {
      page.drawText(title.toUpperCase(), {
        x: margin,
        y,
        size: PdfTypography.bodyLarge,
        font: helveticaBold,
        color: PdfColors.textPrimary,
      });
      y -= 14;
      page.drawLine({ start: { x: margin, y }, end: { x: margin + 140, y }, thickness: 1, color: PdfColors.border });
      y -= 10;
      for (const it of items) {
        const wrapped = wrapText({ text: it, font: helvetica, fontSize: PdfTypography.body, maxWidth: contentWidth - 18 });
        for (const w of wrapped) {
          page.drawText(`[ ] ${w}`, {
            x: margin + 12,
            y,
            size: PdfTypography.body,
            font: helvetica,
            color: PdfColors.textBody,
          });
          y -= PdfTypography.body * PdfTypography.lineHeightRelaxed;
        }
      }
      y -= 10;
    };

    renderBlock('This Week', plan.thisWeek);
    renderBlock('This Month', plan.thisMonth);
    renderBlock('This Quarter', plan.thisQuarter);

    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: PdfColors.border });
    y -= 18;

    // CTA box
    const ctaH = drawCallout({
      page,
      x: margin,
      y,
      w: contentWidth,
      title: 'Need help implementing this?',
      subtitle: plan.ctaHeadline,
      body: `${plan.ctaBody}\n\n${plan.ctaEmail}`,
      accent: PdfColors.textPrimary,
      helveticaBold,
      helvetica,
    });
    y -= ctaH + 16;

    const viewUrl = `${baseUrl.replace(/\/$/, '')}/results/${results.token}`;
    page.drawText(`View online: ${viewUrl}`, {
      x: margin,
      y,
      size: PdfTypography.caption,
      font: helvetica,
      color: PdfColors.textMuted,
    });

    drawHeaderFooter({
      page,
      helveticaBold,
      helvetica,
      pageIndex: 5,
      pageCount,
      createdAtISO: results.created_at,
      company,
    });
  }

  return pdf.save();
}
