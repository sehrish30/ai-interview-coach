import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { intakeAnalysisAgent } from "@/mastra/agents/intake-analysis-agent";
import { researchAgent } from "@/mastra/agents/research-agent";
import { interviewerAgent } from "@/mastra/agents/interviewer-agent";
import { intakeAnalysisOutputSchema } from "@/mastra/schemas/intake-analysis";
import { researchOutputSchema } from "@/mastra/schemas/research";
import { interviewPlanSchema, generatedQuestionSchema } from "@/mastra/schemas/interviewer";
import { getAgentModel, FAST_FAIL_MODEL_SETTINGS } from "@/mastra/model";
import { runAndLogAgent } from "@/server/services/agent-run-logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  upsertResumeDocument,
  upsertJobDescription,
  saveResumeAnalysis,
  saveJobDescriptionAnalysis,
  saveRoleMatch,
} from "@/server/repositories/document-repository";
import { getCachedResearch, saveResearch } from "@/server/repositories/research-repository";
import { savePlan, insertQuestion } from "@/server/repositories/interview-repository";
import { transitionSessionStatus, getSession } from "@/server/repositories/session-repository";

const analyzeStepInput = z.object({
  sessionId: z.string(),
  resumeText: z.string(),
  jobDescriptionText: z.string(),
});
const analyzeStepOutput = z.object({
  sessionId: z.string(),
  intakeAnalysis: intakeAnalysisOutputSchema,
});

// Steps take a service-role client: preparation runs as a background job
// triggered by the owning user's request, already authorized upstream by
// the API route that started it.
const analyzeAndMatchStep = createStep({
  id: "analyze-and-match",
  inputSchema: analyzeStepInput,
  outputSchema: analyzeStepOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const [resumeDoc, jdDoc] = await Promise.all([
      upsertResumeDocument(supabase, inputData.sessionId, inputData.resumeText),
      upsertJobDescription(supabase, inputData.sessionId, inputData.jobDescriptionText),
    ]);

    // Cache hit: both documents were already analyzed for this exact text.
    if (resumeDoc.analysis && jdDoc.analysis) {
      const { data: existingMatch } = await supabase
        .from("role_matches")
        .select("*")
        .eq("resume_document_id", resumeDoc.id)
        .eq("job_description_id", jdDoc.id)
        .maybeSingle();
      if (existingMatch) {
        return {
          sessionId: inputData.sessionId,
          intakeAnalysis: {
            resume: resumeDoc.analysis,
            jobDescription: jdDoc.analysis,
            roleMatch: existingMatch.match,
          } as z.infer<typeof intakeAnalysisOutputSchema>,
        };
      }
    }

    const response = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: intakeAnalysisAgent.name,
      model: getAgentModel(),
      inputSummary: `resume (${inputData.resumeText.length} chars) + job description (${inputData.jobDescriptionText.length} chars)`,
      run: () =>
        intakeAnalysisAgent.generate(
          `RESUME:\n${inputData.resumeText}\n\nJOB DESCRIPTION:\n${inputData.jobDescriptionText}`,
          { structuredOutput: { schema: intakeAnalysisOutputSchema }, modelSettings: FAST_FAIL_MODEL_SETTINGS },
        ),
      summarize: (r) => `overallMatchScore=${r.object.roleMatch.overallMatchScore}`,
    });

    const intakeAnalysis = response.object;

    await Promise.all([
      saveResumeAnalysis(supabase, resumeDoc.id, intakeAnalysis.resume),
      saveJobDescriptionAnalysis(supabase, jdDoc.id, intakeAnalysis.jobDescription),
    ]);
    await saveRoleMatch(supabase, {
      sessionId: inputData.sessionId,
      resumeDocumentId: resumeDoc.id,
      jobDescriptionId: jdDoc.id,
      match: intakeAnalysis.roleMatch,
    });

    return { sessionId: inputData.sessionId, intakeAnalysis };
  },
});

const researchStepOutput = analyzeStepOutput.extend({
  research: researchOutputSchema.nullable(),
});

const researchStep = createStep({
  id: "research-company",
  inputSchema: analyzeStepOutput,
  outputSchema: researchStepOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const session = await getSession(supabase, inputData.sessionId);

    if (!session.research_enabled || !session.target_company) {
      return { ...inputData, research: null };
    }

    const cached = await getCachedResearch(supabase, session.target_company, session.target_role);
    if (cached) {
      return { ...inputData, research: cached.research as z.infer<typeof researchOutputSchema> };
    }

    const response = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: researchAgent.name,
      model: getAgentModel(),
      inputSummary: `company="${session.target_company}" role="${session.target_role}"`,
      run: () =>
        researchAgent.generate(
          `Research company "${session.target_company}" for a candidate interviewing for "${session.target_role}". ` +
            `If your web-search tool returns no results, say research is unavailable rather than guessing.`,
          { structuredOutput: { schema: researchOutputSchema }, modelSettings: FAST_FAIL_MODEL_SETTINGS },
        ),
      summarize: (r) => `${r.object.sources.length} sources`,
    });

    await saveResearch(supabase, {
      company: session.target_company,
      role: session.target_role,
      research: response.object,
    });

    return { ...inputData, research: response.object };
  },
});

const planStepOutput = z.object({
  sessionId: z.string(),
  status: z.literal("ready"),
});

const planAndFirstQuestionStep = createStep({
  id: "plan-and-first-question",
  inputSchema: researchStepOutput,
  outputSchema: planStepOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const session = await getSession(supabase, inputData.sessionId);

    const planResponse = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: interviewerAgent.name,
      model: getAgentModel(),
      inputSummary: `plan for role="${session.target_role}" mode=${session.interview_mode}`,
      run: () =>
        interviewerAgent.generate(
          `Build an interview plan.\n` +
            `Target role: ${session.target_role}\n` +
            `Difficulty: ${session.difficulty}\n` +
            `Total questions: ${session.max_questions}\n` +
            `Intake analysis: ${JSON.stringify(inputData.intakeAnalysis)}\n` +
            `Company research: ${inputData.research ? JSON.stringify(inputData.research) : "none"}`,
          { structuredOutput: { schema: interviewPlanSchema }, modelSettings: FAST_FAIL_MODEL_SETTINGS },
        ),
      summarize: (r) => `${r.object.categories.length} categories, ${r.object.totalQuestions} questions`,
    });

    await savePlan(supabase, inputData.sessionId, planResponse.object);

    const questionResponse = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: interviewerAgent.name,
      model: getAgentModel(),
      inputSummary: "first question",
      run: () =>
        interviewerAgent.generate(
          `Generate the first question for this interview plan: ${JSON.stringify(planResponse.object)}\n` +
            `Intake analysis: ${JSON.stringify(inputData.intakeAnalysis)}`,
          { structuredOutput: { schema: generatedQuestionSchema }, modelSettings: FAST_FAIL_MODEL_SETTINGS },
        ),
      summarize: (r) => r.object.category,
    });

    await insertQuestion(supabase, {
      sessionId: inputData.sessionId,
      sequenceIndex: 0,
      text: questionResponse.object.text,
      category: questionResponse.object.category,
      difficulty: questionResponse.object.difficulty,
      reasonForAsking: questionResponse.object.reasonForAsking,
      competenciesTested: questionResponse.object.competenciesTested,
    });

    await transitionSessionStatus(supabase, inputData.sessionId, "ready");

    return { sessionId: inputData.sessionId, status: "ready" as const };
  },
});

export const preparationWorkflow = createWorkflow({
  id: "preparation-workflow",
  inputSchema: analyzeStepInput,
  outputSchema: planStepOutput,
})
  .then(analyzeAndMatchStep)
  .then(researchStep)
  .then(planAndFirstQuestionStep)
  .commit();
