import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { coachReportAgent } from "@/mastra/agents/coach-report-agent";
import { reportNarrativeSchema } from "@/mastra/schemas/report";
import { interviewPlanSchema } from "@/mastra/schemas/interviewer";
import { getAgentModel } from "@/mastra/model";
import { runAndLogAgent } from "@/server/services/agent-run-logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  computeAnswerScore,
  computeCategoryScores,
  computeOverallScore,
  deriveReadinessLevel,
} from "@/server/services/scoring";
import { listAnswersWithEvaluations, getPlan } from "@/server/repositories/interview-repository";
import { saveFinalReport } from "@/server/repositories/report-repository";
import { getSession } from "@/server/repositories/session-repository";
import { evaluationOutputSchema } from "@/mastra/schemas/evaluation";

const finalizeInput = z.object({ sessionId: z.string() });

const aggregateOutput = z.object({
  sessionId: z.string(),
  overallScore: z.number(),
  categoryScores: z.array(
    z.object({ category: z.string(), score: z.number(), weight: z.number(), answerCount: z.number() }),
  ),
  readinessLevel: z.string(),
  answerSummaries: z.array(
    z.object({
      questionText: z.string(),
      category: z.string(),
      answerScore: z.number(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    }),
  ),
});

const aggregateStep = createStep({
  id: "aggregate-scores",
  inputSchema: finalizeInput,
  outputSchema: aggregateOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const plan = await getPlan(supabase, inputData.sessionId);
    const answers = await listAnswersWithEvaluations(supabase, inputData.sessionId);

    const answersByCategory = new Map<string, number[]>();
    const answerSummaries: z.infer<typeof aggregateOutput>["answerSummaries"] = [];

    for (const { question, evaluation } of answers) {
      if (!evaluation) continue;
      const parsedEvaluation = evaluationOutputSchema.parse(evaluation.evaluation);
      const { answerScore } = computeAnswerScore(parsedEvaluation.scores);
      const existing = answersByCategory.get(question.category) ?? [];
      existing.push(answerScore);
      answersByCategory.set(question.category, existing);
      answerSummaries.push({
        questionText: question.text,
        category: question.category,
        answerScore,
        strengths: parsedEvaluation.strengths,
        weaknesses: parsedEvaluation.weaknesses,
      });
    }

    const parsedPlan = interviewPlanSchema.parse(plan.plan);
    const categoryScores = computeCategoryScores(parsedPlan, answersByCategory);
    const overallScore = computeOverallScore(categoryScores);
    const readinessLevel = deriveReadinessLevel(overallScore);

    return {
      sessionId: inputData.sessionId,
      overallScore,
      categoryScores,
      readinessLevel,
      answerSummaries,
    };
  },
});

const finalizeOutput = z.object({
  sessionId: z.string(),
  overallScore: z.number(),
  readinessLevel: z.string(),
});

const narrateAndSaveStep = createStep({
  id: "narrate-and-save",
  inputSchema: aggregateOutput,
  outputSchema: finalizeOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const session = await getSession(supabase, inputData.sessionId);

    const response = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: coachReportAgent.name,
      model: getAgentModel(),
      inputSummary: `final report, overallScore=${inputData.overallScore}`,
      run: () =>
        coachReportAgent.generate(
          `Write the final report narrative for a "${session.target_role}" interview practice session.\n` +
            `Overall score (already computed, do not recompute): ${inputData.overallScore}\n` +
            `Deterministic readiness level (already computed): ${inputData.readinessLevel}\n` +
            `Category scores: ${JSON.stringify(inputData.categoryScores)}\n` +
            `Per-answer summaries: ${JSON.stringify(inputData.answerSummaries)}`,
          { structuredOutput: { schema: reportNarrativeSchema } },
        ),
      summarize: (r) => r.object.recommendation,
    });

    const report = {
      overallScore: inputData.overallScore,
      categoryScores: inputData.categoryScores,
      answerSummaries: inputData.answerSummaries,
      narrative: response.object,
      disclaimer:
        "This application provides simulated interview practice and coaching. Its scores and " +
        "recommendations should not be treated as real hiring decisions.",
    };

    await saveFinalReport(supabase, {
      sessionId: inputData.sessionId,
      overallScore: inputData.overallScore,
      readinessLevel: response.object.readinessLevel,
      report,
    });

    return {
      sessionId: inputData.sessionId,
      overallScore: inputData.overallScore,
      readinessLevel: response.object.readinessLevel,
    };
  },
});

export const finalizationWorkflow = createWorkflow({
  id: "finalization-workflow",
  inputSchema: finalizeInput,
  outputSchema: finalizeOutput,
})
  .then(aggregateStep)
  .then(narrateAndSaveStep)
  .commit();
