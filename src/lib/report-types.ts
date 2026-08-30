import type { ReportNarrative } from "@/mastra/schemas/report";

/** Shape of the `final_reports.report` jsonb column, as assembled by
 * finalization-workflow.ts. Shared between the report page and the export
 * route so both read the same contract instead of duplicating it. */
export interface StoredReport {
  overallScore: number;
  categoryScores: { category: string; score: number; weight: number; answerCount: number }[];
  answerSummaries: {
    questionText: string;
    category: string;
    answerScore: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  narrative: ReportNarrative;
  disclaimer: string;
}
