import type { EvaluationOutput } from "@/mastra/schemas/evaluation";
import type { InterviewPlan } from "@/mastra/schemas/interviewer";

/**
 * All score arithmetic lives here as plain TypeScript — never delegated to
 * an LLM (spec: "never use an LLM for score arithmetic"). Agents only ever
 * explain numbers computed here.
 */

export const ANSWER_DIMENSION_WEIGHTS = {
  relevance: 0.2,
  completeness: 0.15,
  specificity: 0.15,
  evidence: 0.15,
  structure: 0.1,
  communication: 0.1,
  roleAlignment: 0.15,
} as const;

// Specialist dimensions borrow weight proportionally from the base weights
// above when applicable, so a technical question's score reflects technical
// accuracy without shrinking the denominator for non-technical questions.
const SPECIALIST_WEIGHT = 0.15;

export interface AnswerScoreBreakdown {
  answerScore: number;
  appliedWeights: Record<string, number>;
}

export function computeAnswerScore(scores: EvaluationOutput["scores"]): AnswerScoreBreakdown {
  const specialistCandidates: readonly (readonly [string, number | null])[] = [
    ["technicalAccuracy", scores.technicalAccuracy],
    ["starQuality", scores.starQuality],
  ];
  const specialistEntries: [string, number][] = specialistCandidates.filter(
    (entry): entry is [string, number] => entry[1] !== null,
  );

  const specialistWeightTotal = specialistEntries.length * SPECIALIST_WEIGHT;
  const baseWeightScale = 1 - specialistWeightTotal;

  const appliedWeights: Record<string, number> = {};
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(ANSWER_DIMENSION_WEIGHTS)) {
    const scaledWeight = weight * baseWeightScale;
    appliedWeights[key] = scaledWeight;
    weightedSum += scores[key as keyof typeof ANSWER_DIMENSION_WEIGHTS] * scaledWeight;
  }

  for (const [key, value] of specialistEntries) {
    appliedWeights[key] = SPECIALIST_WEIGHT;
    weightedSum += value * SPECIALIST_WEIGHT;
  }

  return {
    answerScore: roundForPresentation(weightedSum),
    appliedWeights,
  };
}

export interface CategoryScoreInput {
  category: string;
  answerScores: number[];
}

export interface CategoryScoreResult {
  category: string;
  score: number;
  weight: number;
  answerCount: number;
}

/**
 * Averages answer scores within each plan category, then applies the plan's
 * category weights (which must sum to 100) to produce the overall score.
 * Categories with zero answered questions are excluded from the weighted
 * average and their weight is redistributed proportionally across the rest,
 * so an interrupted interview never silently scores a skipped category as 0.
 */
export function computeCategoryScores(
  plan: InterviewPlan,
  answersByCategory: Map<string, number[]>,
): CategoryScoreResult[] {
  const withAnswers = plan.categories
    .map((c) => ({
      category: c.name,
      weight: c.weight,
      answerScores: answersByCategory.get(c.name) ?? [],
    }))
    .filter((c) => c.answerScores.length > 0);

  const totalActiveWeight = withAnswers.reduce((sum, c) => sum + c.weight, 0);

  return withAnswers.map((c) => ({
    category: c.category,
    score: roundForPresentation(average(c.answerScores)),
    weight: totalActiveWeight > 0 ? roundForPresentation((c.weight / totalActiveWeight) * 100) : 0,
    answerCount: c.answerScores.length,
  }));
}

export function computeOverallScore(categoryScores: CategoryScoreResult[]): number {
  if (categoryScores.length === 0) return 0;
  const weightedSum = categoryScores.reduce((sum, c) => sum + c.score * (c.weight / 100), 0);
  return roundForPresentation(weightedSum);
}

export type ReadinessLevel =
  | "not-ready"
  | "developing"
  | "nearly-ready"
  | "interview-ready"
  | "highly-competitive";

/** Deterministic default so the UI always has a readiness level even before
 * the Coach & Report agent's narrative call completes. */
export function deriveReadinessLevel(overallScore: number): ReadinessLevel {
  if (overallScore < 40) return "not-ready";
  if (overallScore < 60) return "developing";
  if (overallScore < 75) return "nearly-ready";
  if (overallScore < 90) return "interview-ready";
  return "highly-competitive";
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Raw values are preserved in storage (jsonb columns); rounding only happens
// at the point of presentation-facing computation, per spec section 12.
function roundForPresentation(value: number): number {
  return Math.round(value * 100) / 100;
}
