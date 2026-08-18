import { z } from "zod";

/**
 * Merges Answer Evaluator + Technical Reviewer + Communication Coach into one
 * structured output. Technical/communication sub-scores are null when not
 * applicable to the question type, per the "don't penalize inapplicable
 * dimensions" rule.
 */
export const evaluationOutputSchema = z.object({
  answerSummary: z.string(),
  scores: z.object({
    relevance: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    specificity: z.number().min(0).max(100),
    evidence: z.number().min(0).max(100),
    structure: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    roleAlignment: z.number().min(0).max(100),
    technicalAccuracy: z.number().min(0).max(100).nullable(),
    starQuality: z.number().min(0).max(100).nullable(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  unsupportedClaims: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  technicalReview: z
    .object({
      isApplicable: z.boolean(),
      correctElements: z.array(z.string()),
      incorrectOrUnclearElements: z.array(z.string()),
      correctedExplanation: z.string().nullable(),
    })
    .nullable(),
  communicationReview: z.object({
    clarityScore: z.number().min(0).max(100),
    concisenessScore: z.number().min(0).max(100),
    logicalFlowScore: z.number().min(0).max(100),
    observations: z.array(z.string()),
    phrasesToImprove: z.array(z.string()),
  }),
  followUpRecommended: z.boolean(),
  followUpReason: z.string().nullable(),
  confidence: z.number().min(0).max(100),
});
export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>;
