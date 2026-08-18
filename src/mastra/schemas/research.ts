import { z } from "zod";

const sourceType = z.enum([
  "official",
  "reputable-secondary-source",
  "candidate-reported",
  "inferred",
]);

export const researchOutputSchema = z.object({
  companyOverview: z.string(),
  productsAndServices: z.array(z.string()),
  officialValuesAndCulture: z.array(z.string()),
  strategicPriorities: z.array(z.string()),
  recentDevelopments: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      relevanceToInterview: z.string(),
      sourceType,
      sourceUrl: z.string(),
      publishedDate: z.string().nullable(),
      accessedAt: z.string(),
      confidence: z.number().min(0).max(100),
    }),
  ),
  industryChallenges: z.array(z.string()),
  competitors: z.array(z.string()),
  roleRelevantInsights: z.array(z.string()),
  interviewProcess: z.object({
    officialProcessFound: z.boolean(),
    summary: z.string().nullable(),
    stages: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        sourceType,
        confidence: z.number().min(0).max(100),
      }),
    ),
    uncertaintyNotes: z.array(z.string()),
  }),
  reportedInterviewThemes: z.array(
    z.object({
      theme: z.string(),
      roleRelevance: z.string(),
      reportFrequency: z.enum(["single-report", "occasional", "repeated-pattern", "unknown"]),
      sourceType,
      confidence: z.number().min(0).max(100),
    }),
  ),
  likelyPreparationTopics: z.array(
    z.object({
      topic: z.string(),
      reason: z.string(),
      priority: z.enum(["low", "medium", "high"]),
    }),
  ),
  suggestedCandidateQuestions: z.array(z.string()),
  warnings: z.array(z.string()),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      publisher: z.string().nullable(),
      sourceType,
      publishedDate: z.string().nullable(),
      accessedAt: z.string(),
    }),
  ),
});
export type ResearchOutput = z.infer<typeof researchOutputSchema>;
