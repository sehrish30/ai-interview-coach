import { z } from "zod";

/**
 * Interpretive narrative layered on top of deterministically computed
 * scores (see src/server/services/scoring.ts). The agent explains numbers
 * it is given — it never computes them.
 */
export const reportNarrativeSchema = z.object({
  strongestCompetencies: z.array(z.string()),
  developmentAreas: z.array(z.string()),
  readinessLevel: z.enum([
    "not-ready",
    "developing",
    "nearly-ready",
    "interview-ready",
    "highly-competitive",
  ]),
  recommendation: z.enum(["strong-no", "no", "mixed", "yes", "strong-yes"]),
  recommendationExplanation: z.string(),
  categoryExplanations: z.array(
    z.object({
      category: z.string(),
      explanation: z.string(),
    }),
  ),
  sevenDayPlan: z.array(
    z.object({
      day: z.number().min(1).max(7),
      focus: z.string(),
      actions: z.array(z.string()),
    }),
  ),
  suggestedCandidateQuestions: z.array(z.string()),
  limitations: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});
export type ReportNarrative = z.infer<typeof reportNarrativeSchema>;
