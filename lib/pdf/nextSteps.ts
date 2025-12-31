import type { ResultsDTO } from '@/lib/results/getResultsForPdf';
import type { NextStepsPack, Tier } from './content/types';
import { getNextStepsForDimension } from './content/lookups';

export type NextStepsPlan = {
  thisWeek: string[];
  thisMonth: string[];
  thisQuarter: string[];
  ctaHeadline: string;
  ctaBody: string;
  ctaEmail: string;
};

function topGapDimensions(results: ResultsDTO, n: number) {
  return [...results.dimensions]
    .sort((a, b) => (a.score - b.score) || (a.order - b.order))
    .slice(0, n);
}

export function generateNextStepsPlan(results: ResultsDTO, pack: NextStepsPack): NextStepsPlan {
  const gaps = topGapDimensions(results, 3);
  const primaryDim = results.primary_gap.dimension_id;

  const thisWeek: string[] = [];
  const thisMonth: string[] = [];
  const thisQuarter: string[] = [];

  for (const g of gaps) {
    const tier = g.tier as Tier;
    const ns = getNextStepsForDimension(pack, g.dimension_id, tier);
    if (ns.this_week?.[0]) thisWeek.push(ns.this_week[0]);
    if (ns.this_month?.[0]) thisMonth.push(ns.this_month[0]);
    if (ns.this_quarter?.[0]) thisQuarter.push(ns.this_quarter[0]);
  }

  const cta = pack.cta_text[primaryDim] ?? pack.cta_text['default'];
  return {
    thisWeek,
    thisMonth,
    thisQuarter,
    ctaHeadline: cta?.headline ?? 'Need help implementing this?',
    ctaBody: cta?.body ?? 'We can help you turn these priorities into a working system.',
    ctaEmail: cta?.email ?? 'heya@maxmin.agency',
  };
}
