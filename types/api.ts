// src/types/api.ts

import type {
  CtaIntensity,
  QuizAnswerDraft,
  ScoringOutput,
} from "./quiz";

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface SubmitTakeRequest {
  answers: QuizAnswerDraft[]; // 24 answers expected (validated server-side)
  utm?: UTMParams;
  /** For analytics attribution without storing PII */
  referrer?: string;
}

export interface TakePreview {
  scoring: Pick<
    ScoringOutput,
    "overallScore" | "level" | "primaryGap" | "criticalGaps"
  >;
  cta: CtaIntensity;
  /** short “top gap teaser” line shown before email gate */
  teaser: string;
}

export interface SubmitTakeResponse {
  token: string;
  preview: TakePreview;
}

export interface SubmitGateRequest {
  email: string;
  company?: string;
}

export interface SubmitGateResponse {
  token: string;
  unlocked: true;
}

export interface ResultsResponse {
  token: string;
  /** If email not set yet, results route returns previewOnly=true */
  previewOnly: boolean;
  preview: TakePreview;
  /** Only present once unlocked (email captured) */
  full?: {
    scoring: ScoringOutput;
    // roadmap + modules will land in Phase 5
  };
}
