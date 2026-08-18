import { z } from "zod";

export const coachingOutputSchema = z.object({
  positiveFeedback: z.array(z.string()),
  improvementAreas: z.array(z.string()),
  starAssessment: z
    .object({
      situation: z.string(),
      task: z.string(),
      action: z.string(),
      result: z.string(),
    })
    .nullable(),
  improvedAnswerOutline: z.array(z.string()),
  sampleImprovedAnswer: z.string(),
  practiceExercise: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});
export type CoachingOutput = z.infer<typeof coachingOutputSchema>;
