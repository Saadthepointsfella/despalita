import type { PDFFont, RGB } from 'pdf-lib';
import type { TextStyle } from './typography';
import { PdfColors, PdfTypography, PdfSpacing, PdfLayout, PdfRules } from './theme';

/**
 * Centralized style system for PDF generation.
 * All typography decisions flow through makeStyles() to ensure consistency.
 */

export type PdfFonts = {
  heading: PDFFont;      // Bold serif for titles/headings
  headingRegular: PDFFont; // Regular serif for scores
  body: PDFFont;         // Body text
  bodyBold: PDFFont;     // Bold body text
};

export type PdfStyles = {
  // Hero/Title styles
  heroTitle: TextStyle;
  heroScore: TextStyle;
  heroTagline: TextStyle;

  // Section headers
  sectionHeader: TextStyle;
  sectionNumber: TextStyle;
  subsectionHeader: TextStyle;

  // Body text
  body: TextStyle;
  bodySmall: TextStyle;
  bodyBold: TextStyle;
  bodySmallBold: TextStyle;

  // Labels and captions
  label: TextStyle;
  caption: TextStyle;
  micro: TextStyle;

  // Muted variants
  bodyMuted: TextStyle;
  captionMuted: TextStyle;

  // Accent variants (for callouts, alerts)
  labelAccent: (accent: RGB) => TextStyle;
};

/**
 * Create a complete styles object from embedded fonts.
 * This centralizes all typography decisions in one place.
 */
export function makeStyles(fonts: PdfFonts): PdfStyles {
  const { heading, headingRegular, body, bodyBold } = fonts;

  return {
    // Hero/Title styles
    heroTitle: {
      font: heading,
      size: PdfTypography.heroTitle,
      color: PdfColors.textPrimary,
      lineHeight: PdfTypography.heroTitle * PdfTypography.lineHeightTight,
    },

    heroScore: {
      font: headingRegular,
      size: PdfTypography.heroScore,
      color: PdfColors.textPrimary,
      lineHeight: PdfTypography.heroScore * PdfTypography.lineHeightTight,
    },

    heroTagline: {
      font: body,
      size: PdfTypography.subsectionHeader,
      color: PdfColors.textBody,
      lineHeight: PdfTypography.subsectionHeader * PdfTypography.lineHeightNormal,
    },

    // Section headers
    sectionHeader: {
      font: heading,
      size: PdfTypography.sectionHeader,
      color: PdfColors.textPrimary,
      lineHeight: PdfTypography.sectionHeader * PdfTypography.lineHeightTight,
    },

    sectionNumber: {
      font: heading,
      size: PdfTypography.bodySmall,
      color: PdfColors.textMuted,
      lineHeight: PdfTypography.bodySmall * PdfTypography.lineHeightTight,
    },

    subsectionHeader: {
      font: heading,
      size: PdfTypography.subsectionHeader,
      color: PdfColors.textPrimary,
      lineHeight: PdfTypography.subsectionHeader * PdfTypography.lineHeightNormal,
    },

    // Body text
    body: {
      font: body,
      size: PdfTypography.body,
      color: PdfColors.textBody,
      lineHeight: PdfTypography.body * PdfTypography.lineHeightNormal,
      paragraphGap: PdfTypography.body * PdfTypography.lineHeightRelaxed,
    },

    bodySmall: {
      font: body,
      size: PdfTypography.bodySmall,
      color: PdfColors.textBody,
      lineHeight: PdfTypography.bodySmall * PdfTypography.lineHeightTight,
      paragraphGap: PdfTypography.bodySmall * PdfTypography.lineHeightNormal,
    },

    bodyBold: {
      font: bodyBold,
      size: PdfTypography.body,
      color: PdfColors.textPrimary,
      lineHeight: PdfTypography.body * PdfTypography.lineHeightNormal,
    },

    bodySmallBold: {
      font: bodyBold,
      size: PdfTypography.bodySmall,
      color: PdfColors.textPrimary,
      lineHeight: PdfTypography.bodySmall * PdfTypography.lineHeightTight,
    },

    // Labels and captions
    label: {
      font: heading,
      size: PdfTypography.caption,
      color: PdfColors.textMuted,
      lineHeight: PdfTypography.caption * PdfTypography.lineHeightTight,
    },

    caption: {
      font: body,
      size: PdfTypography.caption,
      color: PdfColors.textBody,
      lineHeight: PdfTypography.caption * PdfTypography.lineHeightNormal,
    },

    micro: {
      font: body,
      size: PdfTypography.micro,
      color: PdfColors.textMuted,
      lineHeight: PdfTypography.micro * PdfTypography.lineHeightNormal,
    },

    // Muted variants
    bodyMuted: {
      font: body,
      size: PdfTypography.body,
      color: PdfColors.textMuted,
      lineHeight: PdfTypography.body * PdfTypography.lineHeightNormal,
    },

    captionMuted: {
      font: body,
      size: PdfTypography.caption,
      color: PdfColors.textMuted,
      lineHeight: PdfTypography.caption * PdfTypography.lineHeightNormal,
    },

    // Accent variants (factory function for dynamic colors)
    labelAccent: (accent: RGB): TextStyle => ({
      font: heading,
      size: PdfTypography.caption,
      color: accent,
      lineHeight: PdfTypography.caption * PdfTypography.lineHeightTight,
    }),
  };
}

/**
 * Layout constants for page structure.
 */
export const Layout = {
  pageWidth: PdfLayout.pageWidth,
  pageHeight: PdfLayout.pageHeight,
  margin: PdfLayout.margin,
  contentWidth: PdfLayout.contentWidth,
  headerHeight: PdfLayout.headerHeight,
  footerHeight: PdfLayout.footerHeight,

  // Content area bounds
  get contentTop() {
    return this.pageHeight - this.margin - this.headerHeight;
  },
  get contentBottom() {
    return this.margin + this.footerHeight;
  },
};

/**
 * Spacing tokens (re-exported for convenience).
 */
export const Spacing = PdfSpacing;

/**
 * Rule thickness tokens.
 */
export const Rules = PdfRules;

/**
 * Color palette (re-exported for convenience).
 */
export const Colors = PdfColors;

/**
 * Helper to create a TextStyle with custom color.
 */
export function withColor(style: TextStyle, color: RGB): TextStyle {
  return { ...style, color };
}

/**
 * Helper to create a TextStyle with custom font.
 */
export function withFont(style: TextStyle, font: PDFFont): TextStyle {
  return { ...style, font };
}

/**
 * Helper to create a TextStyle with adjusted line height.
 */
export function withLineHeight(style: TextStyle, lineHeight: number): TextStyle {
  return { ...style, lineHeight };
}
