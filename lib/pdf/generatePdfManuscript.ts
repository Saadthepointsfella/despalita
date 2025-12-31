import 'server-only';
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PdfData } from '@/lib/results/getResultsForPdf';
import { buildPdfEnrichment, type EnrichedDimension } from './enrichment';
import { COLORS, PAGE, FONT, SPACE, levelColor, tierColor } from './specTokens';
import {
  fillPageBackground,
  drawHeaderBar,
  drawFooter,
  drawSectionHeader,
  drawParagraph,
  drawCalloutBox,
  drawScoreBar,
  drawRadar,
  drawBulletList,
  drawChecklistSection,
} from './draw';

async function tryEmbedFont(pdfDoc: PDFDocument, url: string): Promise<PDFFont | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    return await pdfDoc.embedFont(bytes);
  } catch {
    return null;
  }
}

export type ManuscriptOpts = {
  data: PdfData;
  baseUrl: string;
};

export async function generatePdfManuscript(opts: ManuscriptOpts): Promise<Uint8Array> {
  const { data, baseUrl } = opts;
  const { results, company } = data;
  const { enrichedDims, alerts, nextLevel } = buildPdfEnrichment(data);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const inter = (await tryEmbedFont(pdfDoc, `${baseUrl}/fonts/Inter-Regular.ttf`)) ?? helv;
  const interSemi = (await tryEmbedFont(pdfDoc, `${baseUrl}/fonts/Inter-SemiBold.ttf`)) ?? helvBold;
  const interBold = (await tryEmbedFont(pdfDoc, `${baseUrl}/fonts/Inter-Bold.ttf`)) ?? helvBold;
  const mono = (await tryEmbedFont(pdfDoc, `${baseUrl}/fonts/JetBrainsMono-Regular.ttf`)) ?? courier;

  const dateStr = new Date(results.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalPages = 6;
  const top3 = [...enrichedDims].sort((a, b) => a.score - b.score).slice(0, 3);

  // Page 1: Executive Summary
  {
    const page = pdfDoc.addPage([PAGE.W, PAGE.H]);
    fillPageBackground(page);
    drawHeaderBar({ page, fontBold: interBold, font: inter, dateStr, company });
    drawFooter({ page, font: inter, pageNum: 1, totalPages });

    const lvl = results.overall.level;
    const lvlColor = levelColor(lvl.level);

    // Centered hero
    const heroY = PAGE.H - 180;

    const levelText = lvl.name.toUpperCase();
    const levelW = interBold.widthOfTextAtSize(levelText, FONT.heroTitle);
    page.drawText(levelText, {
      x: (PAGE.W - levelW) / 2,
      y: heroY,
      size: FONT.heroTitle,
      font: interBold,
      color: lvlColor,
    });

    // Score in monospace
    const scoreText = `${results.overall.score.toFixed(1)} / 5.0`;
    const scoreW = mono.widthOfTextAtSize(scoreText, FONT.pageTitle);
    page.drawText(scoreText, {
      x: (PAGE.W - scoreW) / 2,
      y: heroY - 36,
      size: FONT.pageTitle,
      font: mono,
      color: COLORS.textPrimary,
    });

    // Tagline
    const tagline = lvl.hero_title;
    const tagW = inter.widthOfTextAtSize(tagline, FONT.bodyLarge);
    page.drawText(tagline, {
      x: (PAGE.W - tagW) / 2,
      y: heroY - 60,
      size: FONT.bodyLarge,
      font: inter,
      color: COLORS.textSecondary,
    });

    // Section 01: Summary
    let y = heroY - 100;
    y = drawSectionHeader({ page, fontBold: interBold, number: '01', title: 'Summary', x: PAGE.M, y });
    y -= SPACE[4];

    y = drawParagraph({
      page,
      font: inter,
      text: lvl.hero_copy,
      x: PAGE.M,
      y,
      size: FONT.body,
      color: COLORS.textAccent,
      maxWidth: PAGE.contentW,
      lineHeight: FONT.body * 1.5,
    });

    y -= SPACE[8];

    // Primary gap callout
    const primaryDim = enrichedDims.find((d) => d.dimension_id === results.primary_gap.dimension_id);
    if (primaryDim) {
      const roadmapMod = results.roadmap.find((r) => r.dimension_id === primaryDim.dimension_id);
      y = drawCalloutBox({
        page,
        fontBold: interBold,
        font: inter,
        x: PAGE.M,
        y,
        w: PAGE.contentW,
        title: `Primary Gap: ${primaryDim.name}`,
        subtitle: `Score: ${primaryDim.score.toFixed(1)} / 5.0  |  Tier: ${primaryDim.tier.toUpperCase()}`,
        body: roadmapMod?.what_it_means ?? 'This area needs the most attention to improve your overall maturity.',
        accent: COLORS.primaryGap,
      });
    }

    // Dependency alert (first one if any)
    if (alerts.length > 0) {
      const alert = alerts[0];
      const alertAccent = alert.severity === 'critical' ? COLORS.criticalGap : COLORS.warning;
      y = drawCalloutBox({
        page,
        fontBold: interBold,
        font: inter,
        x: PAGE.M,
        y,
        w: PAGE.contentW,
        title: alert.title,
        body: alert.message,
        accent: alertAccent,
      });
    }
  }

  // Page 2: Dimension Scorecard
  {
    const page = pdfDoc.addPage([PAGE.W, PAGE.H]);
    fillPageBackground(page);
    drawHeaderBar({ page, fontBold: interBold, font: inter, dateStr, company });
    drawFooter({ page, font: inter, pageNum: 2, totalPages });

    let y = PAGE.H - PAGE.M - SPACE[8];
    y = drawSectionHeader({ page, fontBold: interBold, number: '02', title: 'Dimension Scores', x: PAGE.M, y });
    y -= SPACE[6];

    const rowH = 32;
    const barW = 120;
    const nameW = 140;

    const bestDim = [...enrichedDims].sort((a, b) => b.score - a.score)[0];
    const primaryId = results.primary_gap.dimension_id;

    for (const dim of enrichedDims) {
      const isPrimary = dim.dimension_id === primaryId;
      const isBest = dim.dimension_id === bestDim?.dimension_id;
      const fillColor = tierColor(dim.tier);

      // Dim name
      page.drawText(dim.name, {
        x: PAGE.M,
        y: y - FONT.body,
        size: FONT.body,
        font: interSemi,
        color: COLORS.textPrimary,
      });

      // Score
      const scoreStr = dim.score.toFixed(1);
      page.drawText(scoreStr, {
        x: PAGE.M + nameW,
        y: y - FONT.body,
        size: FONT.body,
        font: mono,
        color: COLORS.textSecondary,
      });

      // Bar
      drawScoreBar({
        page,
        x: PAGE.M + nameW + 40,
        y: y - FONT.body - 2,
        score: dim.score,
        width: barW,
        fillColor,
      });

      // Tier badge
      page.drawText(dim.tier.toUpperCase(), {
        x: PAGE.M + nameW + 40 + barW + SPACE[4],
        y: y - FONT.body,
        size: FONT.caption,
        font: inter,
        color: fillColor,
      });

      // Primary / Best badge
      if (isPrimary) {
        const badge = '>> PRIMARY GAP';
        page.drawText(badge, {
          x: PAGE.M + nameW + 40 + barW + 60,
          y: y - FONT.body,
          size: FONT.caption,
          font: interBold,
          color: COLORS.primaryGap,
        });
      } else if (isBest) {
        const badge = '* BEST';
        page.drawText(badge, {
          x: PAGE.M + nameW + 40 + barW + 60,
          y: y - FONT.body,
          size: FONT.caption,
          font: interBold,
          color: COLORS.strength,
        });
      }

      y -= rowH;
    }

    // Radar chart (top-right)
    const radarX = PAGE.W - PAGE.M - 80;
    const radarY = PAGE.H - PAGE.M - 120;
    const scores = enrichedDims.map((d) => d.score);
    drawRadar({
      page,
      x: radarX,
      y: radarY,
      size: 140,
      scores,
      stroke: levelColor(results.overall.level.level),
      fill: COLORS.textPrimary,
    });

    // Dimension labels around radar
    const n = enrichedDims.length;
    const angleStep = (2 * Math.PI) / n;
    const labelR = 85;
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const lx = radarX + Math.cos(angle) * labelR;
      const ly = radarY + Math.sin(angle) * labelR;
      const label = enrichedDims[i].short_label ?? enrichedDims[i].name.slice(0, 3).toUpperCase();
      const tw = inter.widthOfTextAtSize(label, FONT.micro);
      page.drawText(label, {
        x: lx - tw / 2,
        y: ly - FONT.micro / 2,
        size: FONT.micro,
        font: inter,
        color: COLORS.textMuted,
      });
    }
  }

  // Pages 3-5: Priority Roadmaps (one per top gap)
  for (let idx = 0; idx < top3.length; idx++) {
    const dim = top3[idx];
    const pageNum = 3 + idx;
    const page = pdfDoc.addPage([PAGE.W, PAGE.H]);
    fillPageBackground(page);
    drawHeaderBar({ page, fontBold: interBold, font: inter, dateStr, company });
    drawFooter({ page, font: inter, pageNum, totalPages });

    let y = PAGE.H - PAGE.M - SPACE[8];
    const sectionNum = String(pageNum).padStart(2, '0');
    y = drawSectionHeader({
      page,
      fontBold: interBold,
      number: sectionNum,
      title: `Priority #${idx + 1}: ${dim.name}`,
      x: PAGE.M,
      y,
    });
    y -= SPACE[2];

    // Meta line
    const isPrimary = dim.dimension_id === results.primary_gap.dimension_id;
    const gapType = isPrimary ? 'Primary Gap' : dim.score < 2.5 ? 'Critical Gap' : 'Improvement Area';
    const metaText = `Score: ${dim.score.toFixed(1)} / 5.0  |  Tier: ${dim.tier.toUpperCase()}  |  ${gapType}`;
    page.drawText(metaText, {
      x: PAGE.M,
      y,
      size: FONT.caption,
      font: inter,
      color: COLORS.textSecondary,
    });
    y -= SPACE[6];

    // What you told us (observations with Q numbers)
    if (dim.observations.length > 0) {
      page.drawText('WHAT YOU TOLD US', {
        x: PAGE.M,
        y,
        size: FONT.caption,
        font: interBold,
        color: COLORS.textSecondary,
      });
      y -= SPACE[4];

      for (const obs of dim.observations.slice(0, 3)) {
        const prefix = obs.q ? `[${obs.q}] ` : '';
        const flag = obs.red_flag ? ' [!]' : '';
        const text = `${prefix}${obs.short}${flag}`;
        y = drawParagraph({
          page,
          font: inter,
          text,
          x: PAGE.M + SPACE[4],
          y,
          size: FONT.bodySmall,
          color: obs.red_flag ? COLORS.criticalGap : COLORS.textAccent,
          maxWidth: PAGE.contentW - SPACE[4],
          lineHeight: FONT.bodySmall * 1.4,
        });
        y -= SPACE[2];
      }
      y -= SPACE[4];
    }

    // Why this matters (impact)
    if (dim.impact) {
      page.drawText('WHY THIS MATTERS', {
        x: PAGE.M,
        y,
        size: FONT.caption,
        font: interBold,
        color: COLORS.textSecondary,
      });
      y -= SPACE[4];

      if (dim.impact.headline) {
        y = drawParagraph({
          page,
          font: interSemi,
          text: dim.impact.headline,
          x: PAGE.M,
          y,
          size: FONT.body,
          color: COLORS.textPrimary,
          maxWidth: PAGE.contentW,
        });
        y -= SPACE[2];
      }

      if (dim.impact.detail) {
        y = drawParagraph({
          page,
          font: inter,
          text: dim.impact.detail,
          x: PAGE.M,
          y,
          size: FONT.bodySmall,
          color: COLORS.textAccent,
          maxWidth: PAGE.contentW,
        });
        y -= SPACE[2];
      }

      if (dim.impact.business_impact && dim.impact.business_impact.length > 0) {
        y = drawBulletList({
          page,
          font: inter,
          items: dim.impact.business_impact.slice(0, 3),
          x: PAGE.M,
          y,
          maxWidth: PAGE.contentW,
          size: FONT.bodySmall,
          color: COLORS.textAccent,
        });
      }
      y -= SPACE[4];
    }

    // Roadmap (Now/Next/Later)
    const roadmapMod = results.roadmap.find((r) => r.dimension_id === dim.dimension_id);
    if (roadmapMod) {
      page.drawText('YOUR ROADMAP', {
        x: PAGE.M,
        y,
        size: FONT.caption,
        font: interBold,
        color: COLORS.textSecondary,
      });
      y -= SPACE[4];

      if (roadmapMod.now.length > 0) {
        y = drawChecklistSection({
          page,
          fontBold: interBold,
          font: inter,
          title: 'Now (0-30 days)',
          items: roadmapMod.now.slice(0, 3),
          x: PAGE.M,
          y,
          maxWidth: PAGE.contentW,
        });
      }

      if (roadmapMod.next.length > 0) {
        y = drawChecklistSection({
          page,
          fontBold: interBold,
          font: inter,
          title: 'Next (30-90 days)',
          items: roadmapMod.next.slice(0, 3),
          x: PAGE.M,
          y,
          maxWidth: PAGE.contentW,
        });
      }

      if (roadmapMod.later.length > 0) {
        y = drawChecklistSection({
          page,
          fontBold: interBold,
          font: inter,
          title: 'Later (90+ days)',
          items: roadmapMod.later.slice(0, 2),
          x: PAGE.M,
          y,
          maxWidth: PAGE.contentW,
        });
      }
    }

    // Tools to consider
    if (dim.tools && dim.tools.recommended_tools && dim.tools.recommended_tools.length > 0) {
      page.drawText('TOOLS TO CONSIDER', {
        x: PAGE.M,
        y,
        size: FONT.caption,
        font: interBold,
        color: COLORS.textSecondary,
      });
      y -= SPACE[4];

      for (const tool of dim.tools.recommended_tools.slice(0, 3)) {
        const toolLine = `${tool.name} (${tool.category}) - ${tool.price}`;
        page.drawText(toolLine, {
          x: PAGE.M + SPACE[4],
          y,
          size: FONT.bodySmall,
          font: interSemi,
          color: COLORS.textPrimary,
        });
        y -= FONT.bodySmall * 1.4;

        if (tool.fit) {
          page.drawText(tool.fit, {
            x: PAGE.M + SPACE[4],
            y,
            size: FONT.caption,
            font: inter,
            color: COLORS.textSecondary,
          });
          y -= FONT.caption * 1.4;
        }
        y -= SPACE[2];
      }
      y -= SPACE[2];
    }

    // Benchmark
    if (dim.benchmark) {
      page.drawText(`WHAT LEVEL ${nextLevel} LOOKS LIKE`, {
        x: PAGE.M,
        y,
        size: FONT.caption,
        font: interBold,
        color: COLORS.textSecondary,
      });
      y -= SPACE[4];

      if (dim.benchmark.gap_summary) {
        y = drawParagraph({
          page,
          font: inter,
          text: dim.benchmark.gap_summary,
          x: PAGE.M,
          y,
          size: FONT.bodySmall,
          color: COLORS.textAccent,
          maxWidth: PAGE.contentW,
        });
        y -= SPACE[2];
      }

      if (dim.benchmark.target_state && dim.benchmark.target_state.length > 0) {
        y = drawBulletList({
          page,
          font: inter,
          items: dim.benchmark.target_state.slice(0, 4),
          x: PAGE.M,
          y,
          maxWidth: PAGE.contentW,
          size: FONT.bodySmall,
          color: COLORS.textAccent,
        });
      }
    }
  }

  // Page 6: Next Steps
  {
    const page = pdfDoc.addPage([PAGE.W, PAGE.H]);
    fillPageBackground(page);
    drawHeaderBar({ page, fontBold: interBold, font: inter, dateStr, company });
    drawFooter({ page, font: inter, pageNum: 6, totalPages });

    let y = PAGE.H - PAGE.M - SPACE[8];
    y = drawSectionHeader({ page, fontBold: interBold, number: '06', title: 'Next Steps', x: PAGE.M, y });
    y -= SPACE[6];

    // Immediate priorities (top NOW items across all gaps)
    const allNow: string[] = [];
    for (const rm of results.roadmap) {
      for (const item of rm.now.slice(0, 2)) {
        allNow.push(item);
      }
    }

    if (allNow.length > 0) {
      page.drawText('IMMEDIATE PRIORITIES', {
        x: PAGE.M,
        y,
        size: FONT.caption,
        font: interBold,
        color: COLORS.textSecondary,
      });
      y -= SPACE[4];

      y = drawBulletList({
        page,
        font: inter,
        items: allNow.slice(0, 5),
        x: PAGE.M,
        y,
        maxWidth: PAGE.contentW,
        size: FONT.body,
        color: COLORS.textAccent,
        bullet: '[ ]',
      });
      y -= SPACE[6];
    }

    // 30-day milestones (top NEXT items)
    const allNext: string[] = [];
    for (const rm of results.roadmap) {
      for (const item of rm.next.slice(0, 2)) {
        allNext.push(item);
      }
    }

    if (allNext.length > 0) {
      page.drawText('30-DAY MILESTONES', {
        x: PAGE.M,
        y,
        size: FONT.caption,
        font: interBold,
        color: COLORS.textSecondary,
      });
      y -= SPACE[4];

      y = drawBulletList({
        page,
        font: inter,
        items: allNext.slice(0, 4),
        x: PAGE.M,
        y,
        maxWidth: PAGE.contentW,
        size: FONT.body,
        color: COLORS.textAccent,
        bullet: '[ ]',
      });
      y -= SPACE[8];
    }

    // CTA callout
    const cta = results.cta;
    const ctaTitle =
      cta.intensity === 'hot'
        ? 'Ready for Expert Guidance?'
        : cta.intensity === 'warm'
          ? 'Want to Accelerate Your Progress?'
          : 'Keep Building Your Foundation';

    const ctaBody =
      cta.intensity === 'hot'
        ? 'Your assessment indicates you could benefit significantly from a strategic engagement. We offer customized roadmaps and hands-on implementation support.'
        : cta.intensity === 'warm'
          ? 'Based on your results, a focused workshop or consulting session could help you prioritize effectively and avoid common pitfalls.'
          : 'Continue implementing the recommendations above. When you are ready for additional support, we are here to help.';

    y = drawCalloutBox({
      page,
      fontBold: interBold,
      font: inter,
      x: PAGE.M,
      y,
      w: PAGE.contentW,
      title: ctaTitle,
      body: ctaBody,
      accent: cta.intensity === 'hot' ? COLORS.criticalGap : cta.intensity === 'warm' ? COLORS.warning : COLORS.textSecondary,
    });

    y -= SPACE[6];

    // View online
    const onlineUrl = `${baseUrl}/results/${results.token}`;
    page.drawText('View your full results online:', {
      x: PAGE.M,
      y,
      size: FONT.bodySmall,
      font: inter,
      color: COLORS.textSecondary,
    });
    y -= FONT.bodySmall * 1.4;

    page.drawText(onlineUrl, {
      x: PAGE.M,
      y,
      size: FONT.bodySmall,
      font: mono,
      color: COLORS.level5,
    });
  }

  return await pdfDoc.save();
}
