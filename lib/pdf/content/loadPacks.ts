import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AnswerObservationPack,
  BenchmarksPack,
  DependencyRulesPack,
  ImpactPack,
  NextStepsPack,
  ToolRecommendationPack,
} from './types';

const CONFIG_DIR = path.join(process.cwd(), 'config', 'pdf');

async function loadJson<T>(filename: string): Promise<T> {
  const buf = await readFile(path.join(CONFIG_DIR, filename), 'utf8');
  return JSON.parse(buf) as T;
}

export type PdfDetailPacks = {
  observations: AnswerObservationPack;
  impacts: ImpactPack;
  tools: ToolRecommendationPack;
  benchmarks: BenchmarksPack;
  dependencies: DependencyRulesPack;
  nextSteps: NextStepsPack;
};

export async function loadPdfPacks(): Promise<PdfDetailPacks> {
  const [
    observations,
    impacts,
    tools,
    benchmarks,
    dependencies,
    nextSteps,
  ] = await Promise.all([
    loadJson<AnswerObservationPack>('answer-observations.json'),
    loadJson<ImpactPack>('impact-estimates.json'),
    loadJson<ToolRecommendationPack>('tool-recommendations.json'),
    loadJson<BenchmarksPack>('level-benchmarks.json'),
    loadJson<DependencyRulesPack>('dependency-rules.json'),
    loadJson<NextStepsPack>('next-steps-actions.json'),
  ]);

  return { observations, impacts, tools, benchmarks, dependencies, nextSteps };
}
