import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { ResultsDTO, PdfData } from '@/lib/results/getResultsForPdf';
import {
  PdfColors,
  PdfLayout,
  PdfTypography,
  PdfSpacing,
  PdfRules,
  getLevelColor,
  formatDateUTC,
} from './theme';
import {
  clamp,
  Cursor,
  drawCenteredText,
  drawGridOverlay,
  drawInstrumentMark,
  drawRule,
  drawSectionMotif,
  drawTextLines,
  truncateToLines,
  wrapParagraphs,
  wrapText,
} from './utils';
import {
  getAnswerObservation,
  getBenchmarkForTransition,
  getImpact,
  getToolRecommendations,
  getDependencyAlerts,
  getNextStepsForDimension,
} from './content/lookups';
import type { Tier, DimensionKey } from './content/types';
import type { PdfDetailPacks } from './content/loadPacks';
import { generateNextStepsPlan } from './nextSteps';
// New typography and conditional copy systems
import {
  drawParagraph,
  drawList,
  drawChecklist,
  drawLines,
  wrapText as typographyWrapText,
  truncateToLines as typographyTruncateToLines,
  type TextStyle,
} from './typography';
import { makeStyles, type PdfFonts, type PdfStyles, Spacing, Colors, Layout } from './styles';
import {
  extractCapabilities,
  selectCopyVariant,
  getConditionalImpactCopy,
  validateCopyConsistency,
  type DimensionAnswerSummary,
  type CapabilityState,
} from './content/conditionalCopy';

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

/**
 * Build dimension answer summaries for capabilities extraction.
 * Maps user answers to dimension-level summaries with scores.
 */
function buildDimensionSummaries(
  results: ResultsDTO,
  answerContext: PdfAnswerContext,
  packs: PdfDetailPacks
): DimensionAnswerSummary[] {
  const summaries: DimensionAnswerSummary[] = [];

  for (const dim of results.dimensions) {
    const dimAnswers = answerContext.answers
      .filter(a => a.dimension_id === dim.dimension_id)
      .map(a => {
        // Get score from observations pack
        const obs = packs.observations.answer_observations[a.question_id];
        const optKey = a.option_id.includes('_o')
          ? `o${a.option_id.match(/_o(\d+)$/)?.[1] ?? '1'}`
          : a.option_id;
        const score = obs?.options?.[optKey]?.score ?? 1;

        return {
          question_id: a.question_id,
          option_id: a.option_id,
          score,
        };
      });

    const avgScore = dimAnswers.length > 0
      ? dimAnswers.reduce((sum, a) => sum + a.score, 0) / dimAnswers.length
      : dim.score;

    summaries.push({
      dimension_id: dim.dimension_id as DimensionKey,
      answers: dimAnswers,
      avgScore,
      tier: dim.tier as Tier,
    });
  }

  return summaries;
}

/**
 * Deterministic top gaps:
 * 1) primary gap always first
 * 2) then lowest scores excluding primary (tie-break by order)
 */
function topGapsDeterministic(results: ResultsDTO, n = 3): Gap[] {
  const primaryId = results.primary_gap?.dimension_id;
  const dimsSorted = sortDimsByScore(results);

  const primary = dimsSorted.find(d => d.dimension_id === primaryId) ?? dimsSorted[0];
  const rest = dimsSorted.filter(d => d.dimension_id !== primary?.dimension_id);

  const chosen = [primary, ...rest].slice(0, n).filter(Boolean);

  return chosen.map((d) => ({
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

function drawPageBackground(page: any) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PdfLayout.pageWidth,
    height: PdfLayout.pageHeight,
    color: PdfColors.pageBg,
  });

  // Subtle Swiss grid overlay like site
  drawGridOverlay(page);
}

/**
 * Header bar (thin + quiet)
 * - Company name allowed header only (privacy rule)
 * - Date is deterministic (YYYY-MM-DD UTC)
 */
function drawHeaderBar({
  page,
  fontBold,
  font,
  company,
  createdAtISO,
}: {
  page: any;
  fontBold: any;
  font: any;
  company?: string | null;
  createdAtISO: string;
}) {
  const { margin, contentWidth, pageHeight } = PdfLayout;
  const topY = pageHeight - margin;

  const headerY = topY + 10;
  const left = company ? `MAXMIN — ${company}` : 'MAXMIN';
  page.drawText(left, {
    x: margin,
    y: headerY,
    size: PdfTypography.micro,
    font: fontBold,
    color: PdfColors.textBody,
  });

  const dateLabel = formatDateUTC(createdAtISO);
  const dateW = font.widthOfTextAtSize(dateLabel, PdfTypography.micro);
  page.drawText(dateLabel, {
    x: margin + contentWidth - dateW,
    y: headerY,
    size: PdfTypography.micro,
    font,
    color: PdfColors.textMuted,
  });

  drawRule({
    page,
    x: margin,
    y: headerY - 8,
    width: contentWidth,
    thickness: PdfRules.thin,
    color: PdfColors.border,
  });

  // Instrument mark on the right, below the header rule
  drawInstrumentMark({
    page,
    x: margin + contentWidth - 120,
    y: headerY - 24,
    font,
  });
}

function drawFooter({
  page,
  font,
  pageIndex,
  pageCount,
}: {
  page: any;
  font: any;
  pageIndex: number;
  pageCount: number;
}) {
  const { margin, contentWidth } = PdfLayout;
  const footerY = margin - 18;

  drawRule({
    page,
    x: margin,
    y: footerY + 10,
    width: contentWidth,
    thickness: PdfRules.thin,
    color: PdfColors.border,
  });

  page.drawText('maxmin.agency', {
    x: margin,
    y: footerY,
    size: PdfTypography.caption,
    font,
    color: PdfColors.textMuted,
  });

  const pageLabel = `Page ${pageIndex + 1} of ${pageCount}`;
  const pW = font.widthOfTextAtSize(pageLabel, PdfTypography.caption);
  page.drawText(pageLabel, {
    x: margin + contentWidth - pW,
    y: footerY,
    size: PdfTypography.caption,
    font,
    color: PdfColors.textMuted,
  });
}

function drawSectionHeader({
  page,
  x,
  y,
  num,
  title,
  fontBold,
}: {
  page: any;
  x: number;
  y: number;
  num: string;
  title: string;
  fontBold: any;
}) {
  // quiet swiss header: number in muted, title uppercase
  page.drawText(num, {
    x,
    y,
    size: PdfTypography.bodySmall,
    font: fontBold,
    color: PdfColors.textMuted,
  });

  page.drawText(title.toUpperCase(), {
    x: x + 26,
    y,
    size: PdfTypography.sectionHeader,
    font: fontBold,
    color: PdfColors.textPrimary,
  });
}

/**
 * Callout box: sharp corners, left accent stripe, thin border.
 * This is the only “boxed” element; everything else separated by rules + spacing.
 */
function drawCalloutBox({
  page,
  x,
  yTop,
  w,
  label,
  titleLine,
  body,
  accent,
  fontBold,
  font,
}: {
  page: any;
  x: number;
  yTop: number;
  w: number;
  label: string;
  titleLine: string;
  body: string;
  accent: any;
  fontBold: any;
  font: any;
}) {
  const pad = PdfSpacing.s4; // 12
  const labelSize = PdfTypography.caption;
  const titleSize = PdfTypography.subsectionHeader;
  const bodySize = PdfTypography.body;
  const lh = bodySize * PdfTypography.lineHeightRelaxed;

  const bodyLines = wrapParagraphs({
    text: body,
    font,
    fontSize: bodySize,
    maxWidth: w - pad * 2,
  });

  const boxH =
    pad +
    labelSize +
    PdfSpacing.s2 +
    titleSize +
    PdfSpacing.s3 +
    bodyLines.length * lh +
    pad;

  // background + border
  page.drawRectangle({
    x,
    y: yTop - boxH,
    width: w,
    height: boxH,
    color: PdfColors.cardBg,
    borderColor: PdfColors.border,
    borderWidth: PdfRules.thin,
  });

  // accent stripe
  page.drawRectangle({
    x,
    y: yTop - boxH,
    width: 3,
    height: boxH,
    color: accent,
  });

  let cy = yTop - pad - labelSize;
  page.drawText(label.toUpperCase(), {
    x: x + pad,
    y: cy,
    size: labelSize,
    font: fontBold,
    color: accent,
  });

  cy -= PdfSpacing.s2 + titleSize;
  page.drawText(titleLine, {
    x: x + pad,
    y: cy,
    size: titleSize,
    font: fontBold,
    color: PdfColors.textPrimary,
  });

  cy -= PdfSpacing.s3;
  drawTextLines({
    page,
    x: x + pad,
    y: cy,
    lines: bodyLines,
    font,
    fontSize: bodySize,
    color: PdfColors.textBody,
    lineHeight: lh,
  });

  return boxH;
}

function drawHeroLevelBlock({
  page,
  x,
  yTop,
  w,
  levelName,
  scoreText,
  tagline,
  accent,
  fontBold,
  serifBold,
  font,
}: {
  page: any;
  x: number;
  yTop: number;
  w: number;
  levelName: string;
  scoreText: string;
  tagline: string;
  accent: any;
  fontBold: any;
  serifBold: any;
  font: any;
}) {
  // Level hero (no box, just strong type + breathing room)
  drawCenteredText({
    page,
    text: levelName.toUpperCase(),
    x,
    y: yTop,
    width: w,
    size: PdfTypography.heroTitle,
    font: fontBold,
    color: accent,
  });

  const yScore = yTop - (PdfTypography.heroTitle + PdfSpacing.s4);
  drawCenteredText({
    page,
    text: scoreText,
    x,
    y: yScore,
    width: w,
    size: PdfTypography.heroScore,
    font: serifBold,  // Use serif for proper decimal spacing
    color: PdfColors.textPrimary,
  });

  const yTag = yScore - (PdfTypography.heroScore + PdfSpacing.s6);
  const tag = truncateToLines({
    text: tagline,
    font,
    fontSize: PdfTypography.subsectionHeader,
    maxWidth: w,
    maxLines: 2,
    preserveParagraphs: false,
  });

  const tagLines = tag.split('\n');
  drawTextLines({
    page,
    x,
    y: yTag,
    lines: tagLines,
    font,
    fontSize: PdfTypography.subsectionHeader,
    color: PdfColors.textBody,
    lineHeight: PdfTypography.subsectionHeader * PdfTypography.lineHeightNormal,
  });

  // return used height (approx)
  return (PdfTypography.heroTitle + PdfTypography.heroScore + PdfSpacing.s16);
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
  const h = PdfRules.scoreBarHeight; // 6pt
  const fillW = (clamp(score, 0, 5) / 5) * width;

  // background
  page.drawRectangle({ x, y, width, height: h, color: PdfColors.border });
  // fill
  page.drawRectangle({ x, y, width: fillW, height: h, color: PdfColors.textPrimary });
}

function drawDimensionRow({
  page,
  x,
  yTop,
  w,
  section,
  name,
  score,
  tier,
  isPrimary,
  accent,
  fontBold,
  font,
  serifBold,
}: {
  page: any;
  x: number;
  yTop: number;
  w: number;
  section: string;
  name: string;
  score: number;
  tier: string;
  isPrimary: boolean;
  accent: any;
  fontBold: any;
  font: any;
  serifBold: any;
}) {
  // title row
  page.drawText(`${section}  ${name}`, {
    x,
    y: yTop,
    size: PdfTypography.subsectionHeader,
    font: fontBold,
    color: PdfColors.textPrimary,
  });

  const scoreTxt = `${Math.round(score * 10) / 10}`;
  const scoreW = serifBold.widthOfTextAtSize(scoreTxt, PdfTypography.subsectionHeader);
  page.drawText(scoreTxt, {
    x: x + w - scoreW,
    y: yTop,
    size: PdfTypography.subsectionHeader,
    font: serifBold,  // Use serif for proper decimal spacing
    color: PdfColors.textPrimary,
  });

  // Primary marker (tiny dot + label) — accent only
  if (isPrimary) {
    const label = 'PRIMARY GAP';
    const lw = font.widthOfTextAtSize(label, PdfTypography.caption);
    // dot
    page.drawText('•', {
      x: x + w - scoreW - PdfSpacing.s4 - lw - 6,
      y: yTop + 1,
      size: PdfTypography.subsectionHeader,
      font,
      color: accent,
    });
    page.drawText(label, {
      x: x + w - scoreW - PdfSpacing.s4 - lw,
      y: yTop + 2,
      size: PdfTypography.caption,
      font: fontBold,
      color: accent,
    });
  }

  // bar
  const yBar = yTop - PdfSpacing.s4;
  drawScoreBar({ page, x, y: yBar, score, width: w * 0.72 });

  // tier label
  page.drawText(tier, {
    x: x + w * 0.75,
    y: yBar + 1,
    size: PdfTypography.caption,
    font,
    color: PdfColors.textMuted,
  });

  // divider
  const yDiv = yBar - PdfSpacing.s6;
  drawRule({
    page,
    x,
    y: yDiv,
    width: w,
    thickness: PdfRules.thin,
    color: PdfColors.border,
  });

  // return next yTop anchor
  return yDiv - PdfSpacing.s6;
}

function drawChecklistBlock({
  page,
  x,
  yTop,
  w,
  title,
  items,
  fontBold,
  font,
  maxItems = 4,
}: {
  page: any;
  x: number;
  yTop: number;
  w: number;
  title: string;
  items: string[];
  fontBold: any;
  font: any;
  maxItems?: number;
}) {
  let y = yTop;

  page.drawText(title.toUpperCase(), {
    x,
    y,
    size: PdfTypography.bodySmall,
    font: fontBold,
    color: PdfColors.textPrimary,
  });

  y -= PdfSpacing.s1 + PdfTypography.bodySmall;
  drawRule({ page, x, y, width: 150, thickness: PdfRules.thin, color: PdfColors.border });

  y -= PdfSpacing.s2;

  const lh = PdfTypography.bodySmall * PdfTypography.lineHeightTight;
  for (const it of items.slice(0, maxItems)) {
    const wrapped = wrapText({ text: it, font, fontSize: PdfTypography.bodySmall, maxWidth: w - 18 });
    for (const line of wrapped) {
      page.drawText(`[ ] ${line}`, {
        x: x + 10,
        y,
        size: PdfTypography.bodySmall,
        font,
        color: PdfColors.textBody,
      });
      y -= lh;
    }
  }

  return y - PdfSpacing.s2;
}

function drawToolRows({
  page,
  x,
  yTop,
  w,
  tools,
  fontBold,
  font,
  maxRows = 4,
}: {
  page: any;
  x: number;
  yTop: number;
  w: number;
  tools: Array<{ name: string; pricing?: string | null; description?: string | null }>;
  fontBold: any;
  font: any;
  maxRows?: number;
}) {
  let y = yTop;
  const leftW = 140;
  const gap = 8;
  const rightW = w - leftW - gap;
  const lh = PdfTypography.bodySmall * PdfTypography.lineHeightTight;

  for (const t of tools.slice(0, maxRows)) {
    const left = t.name ?? '';
    const right = `${t.pricing ?? ''}${t.pricing && t.description ? ' — ' : ''}${t.description ?? ''}`.trim();

    const leftLines = wrapText({
      text: left,
      font: fontBold,
      fontSize: PdfTypography.body,
      maxWidth: leftW - 4,
    });

    const rightLines = wrapText({
      text: right || '',
      font,
      fontSize: PdfTypography.bodySmall,
      maxWidth: rightW,
    });

    const rows = Math.max(leftLines.length, rightLines.length, 1);

    for (let i = 0; i < rows; i++) {
      const yy = y - i * lh;
      const leftLine = leftLines[i];
      const rightLine = rightLines[i];

      if (leftLine) {
        page.drawText(leftLine, {
          x,
          y: yy,
          size: PdfTypography.body,
          font: fontBold,
          color: PdfColors.textPrimary,
        });
      }

      if (rightLine) {
        page.drawText(rightLine, {
          x: x + leftW + gap,
          y: yy,
          size: PdfTypography.bodySmall,
          font,
          color: PdfColors.textBody,
        });
      }
    }

    y -= rows * lh + PdfSpacing.s4;
  }

  return y;
}

/**
 * Get roadmap actions from next-steps-actions.json pack.
 * Maps this_week/this_month/this_quarter to now/next/later.
 */
function getRoadmapModuleFallback(
  packs: PdfDetailPacks,
  dimension_id: string,
  tier: Tier
): { now: string[]; next: string[]; later: string[]; success_indicator: string } | null {
  // Use getNextStepsForDimension to get roadmap from next-steps-actions.json
  const nextSteps = getNextStepsForDimension(packs.nextSteps, dimension_id, tier);

  // Check if we have any content
  const hasContent = nextSteps.this_week.length > 0 ||
                     nextSteps.this_month.length > 0 ||
                     nextSteps.this_quarter.length > 0;

  if (!hasContent) return null;

  return {
    now: nextSteps.this_week,
    next: nextSteps.this_month,
    later: nextSteps.this_quarter,
    success_indicator: '', // Next steps pack doesn't have success_indicator
  };
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

  const answerContext: PdfAnswerContext = {
    answers: answers.map(a => ({
      question_id: a.question_id,
      option_id: a.option_id,
      dimension_id: a.dimension_id ?? '',
    })),
  };

  const pdf = await PDFDocument.create();

  // Fonts (PDF-safe) - Matches MaxMin website typography
  // Headings: Times-Roman (serif, like Newsreader on website)
  // Body: Courier (monospace, like Space Mono on website)
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const monoBold = await pdf.embedFont(StandardFonts.CourierBold);

  // Aliases for compatibility with existing code
  const font = mono;       // Body text = monospace
  const fontBold = serifBold;  // Bold headings = serif bold

  // Initialize centralized styles
  const pdfFonts: PdfFonts = {
    heading: serifBold,
    headingRegular: serif,
    body: mono,
    bodyBold: monoBold,
  };
  const styles = makeStyles(pdfFonts);

  // Extract capabilities from user answers for conditional copy
  const dimensionSummaries = buildDimensionSummaries(results, answerContext, packs);
  const capabilities = extractCapabilities(dimensionSummaries);

  const level = results.overall.level.level;
  const levelColor = getLevelColor(level);

  const priorityGaps = topGapsDeterministic(results, 3);
  const priorityIds = new Set(priorityGaps.map((g) => g.dimension_id));
  const rest = sortDimsByScore(results).filter((d) => !priorityIds.has(d.dimension_id));
  const allGaps = [...priorityGaps, ...rest];
  const pageCount = allGaps.length + 3;

  // -----------------
  // Page 1: Executive Summary
  // -----------------
  {
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    drawPageBackground(page);

    const { margin, contentWidth, pageHeight } = PdfLayout;
    drawHeaderBar({ page, fontBold, font, company, createdAtISO: results.created_at });

    const cur = new Cursor(pageHeight - margin - 52, margin + PdfLayout.footerHeight + 10);

    // Hero
    const hero = results.overall.level;
    drawHeroLevelBlock({
      page,
      x: margin,
      yTop: cur.y,
      w: contentWidth,
      levelName: hero.name,
      scoreText: scoreLabel(results.overall.score_capped),
      tagline: hero.hero_title,
      accent: levelColor,
      fontBold,
      serifBold,
      font,
    });

    cur.down(PdfSpacing.s16 + 10);

    // Section 01
    drawSectionHeader({ page, x: margin, y: cur.y, num: '01', title: 'Summary', fontBold });
    cur.down(PdfSpacing.s10);

    const heroCopy = truncateToLines({
      text: hero.hero_copy,
      font,
      fontSize: PdfTypography.body,
      maxWidth: contentWidth,
      maxLines: 5,
      preserveParagraphs: true,
    });

    const heroLines = heroCopy.split('\n');
    drawTextLines({
      page,
      x: margin,
      y: cur.y,
      lines: heroLines,
      font,
      fontSize: PdfTypography.body,
      color: PdfColors.textBody,
      lineHeight: PdfTypography.body * PdfTypography.lineHeightRelaxed,
    });

    cur.down(heroLines.length * (PdfTypography.body * PdfTypography.lineHeightRelaxed) + PdfSpacing.s10);

    drawRule({ page, x: margin, y: cur.y, width: contentWidth, thickness: PdfRules.thin, color: PdfColors.border });
    cur.down(PdfSpacing.s8);

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

    const calloutH = drawCalloutBox({
      page,
      x: margin,
      yTop: cur.y,
      w: contentWidth,
      label: 'Primary Gap',
      titleLine: `${primaryName} — ${Math.round(primaryScore * 10) / 10}/5`,
      body: primaryObs,
      accent: levelColor,
      fontBold,
      font,
    });

    cur.down(calloutH + PdfSpacing.s8);

    // Dependency alerts (first one only; deterministic)
    const depAlerts = getDependencyAlerts(packs.dependencies, results);
    if (depAlerts.length && cur.canFit(110)) {
      const alert = depAlerts[0];
      drawCalloutBox({
        page,
        x: margin,
        yTop: cur.y,
        w: contentWidth,
        label: 'Dependency Alert',
        titleLine: alert.title,
        body: alert.message,
        accent: PdfColors.level1,
        fontBold,
        font,
      });
    }

    drawSectionMotif({
      page,
      x: margin,
      y: PdfLayout.margin + PdfLayout.footerHeight + 42,
      width: contentWidth * 0.62,
    });

    drawFooter({ page, font, pageIndex: 0, pageCount });
  }

  // -----------------
  // Page 2: Dimension Scorecard
  // -----------------
  {
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    drawPageBackground(page);

    const { margin, contentWidth, pageHeight } = PdfLayout;
    drawHeaderBar({ page, fontBold, font, company, createdAtISO: results.created_at });

    const cur = new Cursor(pageHeight - margin - 60, margin + PdfLayout.footerHeight + 10);

    drawSectionHeader({ page, x: margin, y: cur.y, num: '02', title: 'Dimension Scores', fontBold });
    cur.down(PdfSpacing.s12);

    // Rows (order fixed by d.order)
    for (const d of [...results.dimensions].sort((a, b) => a.order - b.order)) {
      const nextY = drawDimensionRow({
        page,
        x: margin,
        yTop: cur.y,
        w: contentWidth,
        section: d.section,
        name: d.name,
        score: d.score,
        tier: d.tier,
        isPrimary: d.is_primary_gap,
        accent: levelColor,
        fontBold,
        font,
        serifBold,
      });
      cur.y = nextY;

      // If we’re too low, stop (stable)
      if (!cur.canFit(40)) break;
    }

    drawSectionMotif({
      page,
      x: margin,
      y: PdfLayout.margin + PdfLayout.footerHeight + 42,
      width: contentWidth * 0.62,
    });

    drawFooter({ page, font, pageIndex: 1, pageCount });
  }

  // -----------------
  // Pages 3–5: Gap deep dives
  // -----------------
  for (let i = 0; i < allGaps.length; i++) {
    const gap = allGaps[i];
    const isPriority = i < 3;
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    drawPageBackground(page);

    const { margin, contentWidth, pageHeight } = PdfLayout;
    drawHeaderBar({ page, fontBold, font, company, createdAtISO: results.created_at });

    const cur = new Cursor(pageHeight - margin - 60, margin + PdfLayout.footerHeight + 10);

    const num = String(3 + i).padStart(2, '0');
    drawSectionHeader({
      page,
      x: margin,
      y: cur.y,
      num,
      title: isPriority ? `Priority #${i + 1}: ${gap.name}` : `Dimension: ${gap.name}`,
      fontBold,
    });
    cur.down(PdfSpacing.s4);

    page.drawText(`Score: ${scoreLabel(gap.score)} — Tier: ${gap.tier}${gap.is_primary_gap ? ' — Primary Gap' : ''}`, {
      x: margin,
      y: cur.y,
      size: PdfTypography.bodySmall,
      font,
      color: PdfColors.textBody,
    });

    cur.down(PdfSpacing.s4);
    drawRule({ page, x: margin, y: cur.y, width: contentWidth, thickness: PdfRules.thin, color: PdfColors.border });
    cur.down(PdfSpacing.s4);

    // WHAT YOU TOLD US
    page.drawText('WHAT YOU TOLD US', {
      x: margin,
      y: cur.y,
      size: PdfTypography.caption,
      font: fontBold,
      color: PdfColors.textMuted,
    });
    cur.down(PdfSpacing.s3);

    const dimAnswers = answerContext.answers.filter((a) => a.dimension_id === gap.dimension_id);
    const observations = dimAnswers
      .map((a) => getAnswerObservation(packs.observations, a.question_id, a.option_id)?.summary)
      .filter(Boolean) as string[];

    const bulletLH = PdfTypography.bodySmall * PdfTypography.lineHeightNormal;
    const bulletMax = 6;

    if (observations.length) {
      for (const line of observations.slice(0, bulletMax)) {
        const wrapped = wrapText({ text: line, font, fontSize: PdfTypography.bodySmall, maxWidth: contentWidth - 16 });
        for (const w of wrapped) {
          page.drawText(`– ${w}`, {
            x: margin,
            y: cur.y,
            size: PdfTypography.bodySmall,
            font,
            color: PdfColors.textBody,
          });
          cur.down(bulletLH);
        }
      }
    } else {
      page.drawText('– (No observations available for this dimension yet.)', {
        x: margin,
        y: cur.y,
        size: PdfTypography.bodySmall,
        font,
        color: PdfColors.textMuted,
      });
      cur.down(bulletLH);
    }

    cur.down(PdfSpacing.s2);
    drawRule({ page, x: margin, y: cur.y, width: contentWidth, thickness: PdfRules.thin, color: PdfColors.border });
    cur.down(PdfSpacing.s4);

    // WHY THIS MATTERS - using conditional copy based on capabilities
    page.drawText('WHY THIS MATTERS', {
      x: margin,
      y: cur.y,
      size: PdfTypography.caption,
      font: fontBold,
      color: PdfColors.textMuted,
    });
    cur.down(PdfSpacing.s3);

    // Get base impact from pack
    const baseImpact = getImpact(packs.impacts, gap.dimension_id, gap.tier);

    // Select conditional copy variant based on user's capabilities
    const copyVariant = selectCopyVariant(
      gap.dimension_id as DimensionKey,
      gap.tier,
      capabilities
    );

    // Get conditional copy, falling back to base impact
    const impactCopy = getConditionalImpactCopy(
      gap.dimension_id as DimensionKey,
      gap.tier,
      copyVariant,
      baseImpact ? { headline: baseImpact.headline, detail: baseImpact.detail } : null
    );

    // Validate consistency (log warnings in development)
    if (process.env.NODE_ENV === 'development') {
      const copyWarnings = validateCopyConsistency(
        observations,
        impactCopy,
        capabilities,
        gap.dimension_id as DimensionKey
      );
      if (copyWarnings.length > 0) {
        console.warn(`[PDF] Copy consistency warnings for ${gap.dimension_id}:`, copyWarnings);
      }
    }

    if (impactCopy) {
      page.drawText(impactCopy.headline ?? 'Impact', {
        x: margin,
        y: cur.y,
        size: PdfTypography.body,
        font: fontBold,
        color: PdfColors.textPrimary,
      });
      cur.down(PdfSpacing.s3);

      const body = truncateToLines({
        text: impactCopy.detail ?? '',
        font,
        fontSize: PdfTypography.bodySmall,
        maxWidth: contentWidth,
        maxLines: 5,
        preserveParagraphs: true,
      });

      const lines = body.split('\n');
      drawTextLines({
        page,
        x: margin,
        y: cur.y,
        lines,
        font,
        fontSize: PdfTypography.bodySmall,
        color: PdfColors.textBody,
        lineHeight: PdfTypography.bodySmall * PdfTypography.lineHeightNormal,
      });
      cur.down(lines.length * (PdfTypography.bodySmall * PdfTypography.lineHeightNormal));
    } else {
      page.drawText('(No impact estimate for this dimension/tier yet.)', {
        x: margin,
        y: cur.y,
        size: PdfTypography.bodySmall,
        font,
        color: PdfColors.textMuted,
      });
      cur.down(PdfTypography.bodySmall * PdfTypography.lineHeightNormal);
    }

    cur.down(PdfSpacing.s2);
    drawRule({ page, x: margin, y: cur.y, width: contentWidth, thickness: PdfRules.thin, color: PdfColors.border });
    cur.down(PdfSpacing.s4);

    // YOUR ROADMAP
    page.drawText('YOUR ROADMAP', {
      x: margin,
      y: cur.y,
      size: PdfTypography.caption,
      font: fontBold,
      color: PdfColors.textMuted,
    });
    cur.down(PdfSpacing.s3);

    // 1) Prefer ResultsDTO.roadmap
    const rm = results.roadmap?.find((r) => r.dimension_id === gap.dimension_id) ?? null;

    // 2) Otherwise pack-driven fallback (optional pack)
    const rmFallback = !rm ? getRoadmapModuleFallback(packs, gap.dimension_id, gap.tier) : null;

    const roadmap = rm ?? rmFallback;

    if (roadmap) {
      cur.y = drawChecklistBlock({
        page,
        x: margin,
        yTop: cur.y,
        w: contentWidth,
        title: 'Now (This Week)',
        items: roadmap.now ?? [],
        fontBold,
        font,
      });

      cur.y = drawChecklistBlock({
        page,
        x: margin,
        yTop: cur.y,
        w: contentWidth,
        title: 'Next (This Month)',
        items: roadmap.next ?? [],
        fontBold,
        font,
      });

      cur.y = drawChecklistBlock({
        page,
        x: margin,
        yTop: cur.y,
        w: contentWidth,
        title: 'Later (This Quarter)',
        items: roadmap.later ?? [],
        fontBold,
        font,
      });

      if (roadmap.success_indicator) {
        page.drawText(`Success indicator: ${roadmap.success_indicator}`, {
          x: margin,
          y: cur.y,
          size: PdfTypography.caption,
          font,
          color: PdfColors.textMuted,
        });
        cur.down(PdfSpacing.s6);
      }
    } else {
      // Stable non-content placeholder (not “roadmap copy”)
      page.drawText('(Roadmap module not available yet.)', {
        x: margin,
        y: cur.y,
        size: PdfTypography.body,
        font,
        color: PdfColors.textMuted,
      });
      cur.down(PdfTypography.body * PdfTypography.lineHeightRelaxed);
    }

    cur.down(PdfSpacing.s2);
    drawRule({ page, x: margin, y: cur.y, width: contentWidth, thickness: PdfRules.thin, color: PdfColors.border });
    cur.down(PdfSpacing.s4);

    // TOOLS TO CONSIDER
    page.drawText('TOOLS TO CONSIDER', {
      x: margin,
      y: cur.y,
      size: PdfTypography.caption,
      font: fontBold,
      color: PdfColors.textMuted,
    });
    cur.down(PdfSpacing.s4);

    const tools = getToolRecommendations(packs.tools, gap.dimension_id, gap.tier) ?? [];
    if (tools.length) {
      cur.y = drawToolRows({
        page,
        x: margin,
        yTop: cur.y,
        w: contentWidth,
        tools,
        fontBold,
        font,
      });
    } else {
      page.drawText('(No tool recommendations for this dimension/tier yet.)', {
        x: margin,
        y: cur.y,
        size: PdfTypography.bodySmall,
        font,
        color: PdfColors.textMuted,
      });
      cur.down(PdfTypography.bodySmall * PdfTypography.lineHeightNormal);
    }

    cur.down(PdfSpacing.s2);
    drawRule({ page, x: margin, y: cur.y, width: contentWidth, thickness: PdfRules.thin, color: PdfColors.border });
    cur.down(PdfSpacing.s4);

    // WHAT GOOD LOOKS LIKE
    page.drawText('WHAT GOOD LOOKS LIKE', {
      x: margin,
      y: cur.y,
      size: PdfTypography.caption,
      font: fontBold,
      color: PdfColors.textMuted,
    });
    cur.down(PdfSpacing.s4);

    const nextLevel = clamp((results.overall.level.level + 1) as any, 1, 5) as 1 | 2 | 3 | 4 | 5;
    const bench = getBenchmarkForTransition(
      packs.benchmarks,
      gap.dimension_id,
      results.overall.level.level,
      nextLevel
    );

    if (bench) {
      page.drawText(`At Level ${nextLevel}, you can:`, {
        x: margin,
        y: cur.y,
        size: PdfTypography.body,
        font: fontBold,
        color: PdfColors.textPrimary,
      });
      cur.down(PdfSpacing.s3);

      for (const c of (bench.capabilities ?? []).slice(0, 4)) {
        const wrapped = wrapText({ text: c, font, fontSize: PdfTypography.bodySmall, maxWidth: contentWidth - 16 });
        for (const w of wrapped) {
          page.drawText(`– ${w}`, {
            x: margin,
            y: cur.y,
            size: PdfTypography.bodySmall,
            font,
            color: PdfColors.textBody,
          });
          cur.down(PdfTypography.bodySmall * PdfTypography.lineHeightTight);
        }
      }

      if (bench.you_know_you_are_there_when) {
        cur.down(PdfSpacing.s2);
        const yn = truncateToLines({
          text: bench.you_know_you_are_there_when,
          font,
          fontSize: PdfTypography.bodySmall,
          maxWidth: contentWidth,
          maxLines: 3,
          preserveParagraphs: true,
        });
        const ynLines = yn.split('\n');
        drawTextLines({
          page,
          x: margin,
          y: cur.y,
          lines: ynLines,
          font,
          fontSize: PdfTypography.bodySmall,
          color: PdfColors.textBody,
          lineHeight: PdfTypography.bodySmall * PdfTypography.lineHeightTight,
        });
      }
    } else {
      page.drawText('(No benchmark copy for this dimension/transition yet.)', {
        x: margin,
        y: cur.y,
        size: PdfTypography.bodySmall,
        font,
        color: PdfColors.textMuted,
      });
    }

    drawFooter({ page, font, pageIndex: 2 + i, pageCount });
  }

  // -----------------
  // Final Page: Next Steps + CTA
  // -----------------
  {
    const page = pdf.addPage([PdfLayout.pageWidth, PdfLayout.pageHeight]);
    drawPageBackground(page);

    const { margin, contentWidth, pageHeight } = PdfLayout;
    drawHeaderBar({ page, fontBold, font, company, createdAtISO: results.created_at });

    const cur = new Cursor(pageHeight - margin - 60, margin + PdfLayout.footerHeight + 10);

    const nextStepsNum = String(3 + allGaps.length).padStart(2, '0');
    drawSectionHeader({ page, x: margin, y: cur.y, num: nextStepsNum, title: 'Next Steps', fontBold });
    cur.down(PdfSpacing.s12);

    const plan = generateNextStepsPlan(results, packs.nextSteps);

    const renderBlock = (title: string, items: string[]) => {
      cur.y = drawChecklistBlock({
        page,
        x: margin,
        yTop: cur.y,
        w: contentWidth,
        title,
        items,
        fontBold,
        font,
        maxItems: 6,
      });
    };

    renderBlock('This Week', plan.thisWeek);
    renderBlock('This Month', plan.thisMonth);
    renderBlock('This Quarter', plan.thisQuarter);

    cur.down(PdfSpacing.s2);
    drawRule({ page, x: margin, y: cur.y, width: contentWidth, thickness: PdfRules.thin, color: PdfColors.border });
    cur.down(PdfSpacing.s8);

    // CTA box (paragraph-safe)
    const ctaBody = `${plan.ctaBody}\n\n${plan.ctaEmail}`;
    const ctaH = drawCalloutBox({
      page,
      x: margin,
      yTop: cur.y,
      w: contentWidth,
      label: 'Need help implementing this?',
      titleLine: plan.ctaHeadline,
      body: ctaBody,
      accent: PdfColors.textPrimary,
      fontBold,
      font,
    });
    cur.down(ctaH + PdfSpacing.s8);

    const viewUrl = `${baseUrl.replace(/\/$/, '')}/results/${results.token}`;
    page.drawText(`View online: ${viewUrl}`, {
      x: margin,
      y: cur.y,
      size: PdfTypography.caption,
      font,
      color: PdfColors.textMuted,
    });

    drawFooter({ page, font, pageIndex: 2 + allGaps.length, pageCount });
  }

  return pdf.save();
}
