import { z } from "zod";

export const resumeAnalysisSchema = z.object({
  candidateSummary: z.string(),
  yearsOfExperience: z.number().nullable(),
  industries: z.array(z.string()),
  technicalSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  tools: z.array(z.string()),
  achievements: z.array(
    z.object({
      statement: z.string(),
      measurableImpact: z.string().nullable(),
      evidenceStrength: z.enum(["strong", "medium", "weak"]),
    }),
  ),
  leadershipExamples: z.array(z.string()),
  potentialConcerns: z.array(z.string()),
  interviewTopics: z.array(z.string()),
  suggestedStarStories: z.array(z.string()),
});
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

export const jobDescriptionAnalysisSchema = z.object({
  jobTitle: z.string(),
  seniority: z.string().nullable(),
  mandatoryRequirements: z.array(z.string()),
  preferredRequirements: z.array(z.string()),
  technicalCompetencies: z.array(z.string()),
  behavioralCompetencies: z.array(z.string()),
  leadershipExpectations: z.array(z.string()),
  responsibilities: z.array(z.string()),
  industryKnowledge: z.array(z.string()),
  keywords: z.array(z.string()),
  likelyInterviewThemes: z.array(z.string()),
});
export type JobDescriptionAnalysis = z.infer<typeof jobDescriptionAnalysisSchema>;

export const roleMatchSchema = z.object({
  overallMatchScore: z.number().min(0).max(100),
  categoryScores: z.object({
    experience: z.number().min(0).max(100),
    technicalSkills: z.number().min(0).max(100),
    behavioralSkills: z.number().min(0).max(100),
    leadership: z.number().min(0).max(100),
    industryKnowledge: z.number().min(0).max(100),
  }),
  strongMatches: z.array(z.string()),
  partialMatches: z.array(z.string()),
  skillGaps: z.array(z.string()),
  evidenceGaps: z.array(z.string()),
  transferableStrengths: z.array(z.string()),
  preparationPriorities: z.array(z.string()),
});
export type RoleMatch = z.infer<typeof roleMatchSchema>;

/**
 * Single structured output for the Intake & Analysis agent: resume analysis,
 * job-description analysis, and role match are always requested together
 * since role-matching strictly depends on the other two — one model call
 * instead of three.
 */
export const intakeAnalysisOutputSchema = z.object({
  resume: resumeAnalysisSchema,
  jobDescription: jobDescriptionAnalysisSchema,
  roleMatch: roleMatchSchema,
});
export type IntakeAnalysisOutput = z.infer<typeof intakeAnalysisOutputSchema>;
