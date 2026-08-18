import { z } from "zod";

export const interviewPlanSchema = z.object({
  interviewTitle: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedMinutes: z.number(),
  totalQuestions: z.number(),
  categories: z.array(
    z.object({
      name: z.string(),
      weight: z.number(),
      objectives: z.array(z.string()),
      targetQuestionCount: z.number(),
    }),
  ),
  focusAreas: z.array(z.string()),
  riskAreas: z.array(z.string()),
  coachingPriorities: z.array(z.string()),
});
export type InterviewPlan = z.infer<typeof interviewPlanSchema>;

export const generatedQuestionSchema = z.object({
  text: z.string(),
  category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  reasonForAsking: z.string(),
  competenciesTested: z.array(z.string()),
  expectedEvidence: z.array(z.string()),
});
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

/**
 * One call per interview turn: given the plan, question history, and the
 * latest answer evaluation, decide whether a follow-up is warranted and (if
 * not, or if follow-up depth is exhausted) produce the next primary question.
 */
export const interviewTurnDecisionSchema = z.object({
  shouldAskFollowUp: z.boolean(),
  followUpQuestion: z.string().nullable(),
  followUpReason: z.string().nullable(),
  nextQuestion: generatedQuestionSchema.nullable(),
  interviewComplete: z.boolean(),
  completionReason: z.string().nullable(),
});
export type InterviewTurnDecision = z.infer<typeof interviewTurnDecisionSchema>;
