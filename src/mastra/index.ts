import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { intakeAnalysisAgent } from "@/mastra/agents/intake-analysis-agent";
import { researchAgent } from "@/mastra/agents/research-agent";
import { interviewerAgent } from "@/mastra/agents/interviewer-agent";
import { evaluatorAgent } from "@/mastra/agents/evaluator-agent";
import { coachReportAgent } from "@/mastra/agents/coach-report-agent";
import { preparationWorkflow } from "@/mastra/workflows/preparation-workflow";
import { interviewTurnWorkflow } from "@/mastra/workflows/interview-turn-workflow";
import { finalizationWorkflow } from "@/mastra/workflows/finalization-workflow";

export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: process.env.MASTRA_STORAGE_DB_URL ?? "file:./mastra.db",
  }),
  agents: {
    intakeAnalysisAgent,
    researchAgent,
    interviewerAgent,
    evaluatorAgent,
    coachReportAgent,
  },
  workflows: {
    preparationWorkflow,
    interviewTurnWorkflow,
    finalizationWorkflow,
  },
});
