import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { evaluatorAgent } from "@/mastra/agents/evaluator-agent";
import { coachReportAgent } from "@/mastra/agents/coach-report-agent";
import { interviewerAgent } from "@/mastra/agents/interviewer-agent";
import { evaluationOutputSchema } from "@/mastra/schemas/evaluation";
import { coachingOutputSchema } from "@/mastra/schemas/coaching";
import { interviewTurnDecisionSchema } from "@/mastra/schemas/interviewer";
import { getAgentModel } from "@/mastra/model";
import { runAndLogAgent } from "@/server/services/agent-run-logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { computeAnswerScore } from "@/server/services/scoring";
import { canAskAnotherQuestion } from "@/server/services/session-state";
import {
  getQuestion,
  insertAnswer,
  markQuestionAnswered,
  saveEvaluation,
  saveCoaching,
  insertQuestion,
  listQuestionsForSession,
} from "@/server/repositories/interview-repository";
import {
  getSession,
  incrementQuestionIndex,
  transitionSessionStatus,
} from "@/server/repositories/session-repository";
import { getPlan } from "@/server/repositories/interview-repository";

const turnInput = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answerText: z.string(),
});

const evaluateStepOutput = z.object({
  sessionId: z.string(),
  answerId: z.string(),
  answerScore: z.number(),
  evaluation: evaluationOutputSchema,
});

const evaluateStep = createStep({
  id: "record-and-evaluate",
  inputSchema: turnInput,
  outputSchema: evaluateStepOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const question = await getQuestion(supabase, inputData.questionId);

    const answer = await insertAnswer(supabase, {
      sessionId: inputData.sessionId,
      questionId: inputData.questionId,
      answerText: inputData.answerText,
    });
    await markQuestionAnswered(supabase, inputData.questionId);

    const response = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: evaluatorAgent.name,
      model: getAgentModel(),
      inputSummary: `question category=${question.category} answer length=${inputData.answerText.length}`,
      run: () =>
        evaluatorAgent.generate(
          `QUESTION (${question.category}, ${question.difficulty}): ${question.text}\n\n` +
            `CANDIDATE ANSWER:\n${inputData.answerText}`,
          { structuredOutput: { schema: evaluationOutputSchema } },
        ),
      summarize: (r) => `relevance=${r.object.scores.relevance}`,
    });

    const { answerScore } = computeAnswerScore(response.object.scores);

    await saveEvaluation(supabase, {
      sessionId: inputData.sessionId,
      answerId: answer.id,
      scores: response.object.scores,
      evaluation: response.object,
    });

    return {
      sessionId: inputData.sessionId,
      answerId: answer.id,
      answerScore,
      evaluation: response.object,
    };
  },
});

const coachStepOutput = evaluateStepOutput.extend({
  coaching: coachingOutputSchema.nullable(),
});

const coachStep = createStep({
  id: "coach-if-practice",
  inputSchema: evaluateStepOutput,
  outputSchema: coachStepOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const session = await getSession(supabase, inputData.sessionId);

    if (session.interview_mode !== "practice") {
      return { ...inputData, coaching: null };
    }

    const response = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: coachReportAgent.name,
      model: getAgentModel(),
      inputSummary: "per-answer coaching",
      run: () =>
        coachReportAgent.generate(
          `Coach this answer. Evaluation: ${JSON.stringify(inputData.evaluation)}`,
          { structuredOutput: { schema: coachingOutputSchema } },
        ),
      summarize: (r) => r.object.priority,
    });

    await saveCoaching(supabase, {
      sessionId: inputData.sessionId,
      answerId: inputData.answerId,
      feedback: response.object,
    });

    return { ...inputData, coaching: response.object };
  },
});

const decideNextOutput = z.object({
  sessionId: z.string(),
  answerScore: z.number(),
  coaching: coachingOutputSchema.nullable(),
  interviewComplete: z.boolean(),
  nextQuestionId: z.string().nullable(),
});

const decideNextStep = createStep({
  id: "decide-next",
  inputSchema: coachStepOutput,
  outputSchema: decideNextOutput,
  execute: async ({ inputData }) => {
    const supabase = createSupabaseServiceRoleClient();
    const session = await getSession(supabase, inputData.sessionId);
    const plan = await getPlan(supabase, inputData.sessionId);
    const questions = await listQuestionsForSession(supabase, inputData.sessionId);

    await incrementQuestionIndex(supabase, inputData.sessionId);
    const updatedSession = await getSession(supabase, inputData.sessionId);

    const canContinue = canAskAnotherQuestion({
      currentQuestionIndex: updatedSession.current_question_index,
      maxQuestions: updatedSession.max_questions,
    });

    if (!canContinue) {
      await transitionSessionStatus(supabase, inputData.sessionId, "completed");
      return {
        sessionId: inputData.sessionId,
        answerScore: inputData.answerScore,
        coaching: inputData.coaching,
        interviewComplete: true,
        nextQuestionId: null,
      };
    }

    const lastQuestion = questions[questions.length - 1];
    const followUpCount = questions.filter((q) => q.parent_question_id === lastQuestion?.id).length;
    const followUpBudgetRemaining = followUpCount < session.max_follow_ups_per_question;

    const response = await runAndLogAgent({
      sessionId: inputData.sessionId,
      agentName: interviewerAgent.name,
      model: getAgentModel(),
      inputSummary: "turn decision",
      // State is rebuilt from Supabase and passed explicitly each turn rather
      // than relying on interviewerAgent's attached memory, since Supabase is
      // the system of record and no { resource, thread } is passed here.
      run: () =>
        interviewerAgent.generate(
          `Plan: ${JSON.stringify(plan.plan)}\n` +
            `Questions asked so far: ${JSON.stringify(questions.map((q) => ({ text: q.text, category: q.category })))}\n` +
            `Latest answer evaluation: ${JSON.stringify(inputData.evaluation ?? {})}\n` +
            `Follow-up budget remaining for the last question: ${followUpBudgetRemaining}\n` +
            `Questions asked: ${updatedSession.current_question_index} / ${updatedSession.max_questions}\n` +
            `Decide the next step.`,
          { structuredOutput: { schema: interviewTurnDecisionSchema } },
        ),
      summarize: (r) => (r.object.shouldAskFollowUp ? "follow-up" : "next-question"),
    });

    const decision = response.object;

    if (decision.interviewComplete) {
      await transitionSessionStatus(supabase, inputData.sessionId, "completed");
      return {
        sessionId: inputData.sessionId,
        answerScore: inputData.answerScore,
        coaching: inputData.coaching,
        interviewComplete: true,
        nextQuestionId: null,
      };
    }

    if (decision.shouldAskFollowUp && followUpBudgetRemaining && decision.followUpQuestion) {
      const followUp = await insertQuestion(supabase, {
        sessionId: inputData.sessionId,
        parentQuestionId: lastQuestion?.id ?? null,
        sequenceIndex: questions.length,
        isFollowUp: true,
        text: decision.followUpQuestion,
        category: lastQuestion?.category ?? "follow-up",
        difficulty: lastQuestion?.difficulty ?? "medium",
        reasonForAsking: decision.followUpReason,
      });
      return {
        sessionId: inputData.sessionId,
        answerScore: inputData.answerScore,
        coaching: inputData.coaching,
        interviewComplete: false,
        nextQuestionId: followUp.id,
      };
    }

    if (decision.nextQuestion) {
      const next = await insertQuestion(supabase, {
        sessionId: inputData.sessionId,
        sequenceIndex: questions.length,
        text: decision.nextQuestion.text,
        category: decision.nextQuestion.category,
        difficulty: decision.nextQuestion.difficulty,
        reasonForAsking: decision.nextQuestion.reasonForAsking,
        competenciesTested: decision.nextQuestion.competenciesTested,
      });
      return {
        sessionId: inputData.sessionId,
        answerScore: inputData.answerScore,
        coaching: inputData.coaching,
        interviewComplete: false,
        nextQuestionId: next.id,
      };
    }

    // Agent produced neither a follow-up nor a next question: treat as complete
    // rather than leaving the session stuck with nothing to show the candidate.
    await transitionSessionStatus(supabase, inputData.sessionId, "completed");
    return {
      sessionId: inputData.sessionId,
      answerScore: inputData.answerScore,
      coaching: inputData.coaching,
      interviewComplete: true,
      nextQuestionId: null,
    };
  },
});

export const interviewTurnWorkflow = createWorkflow({
  id: "interview-turn-workflow",
  inputSchema: turnInput,
  outputSchema: decideNextOutput,
})
  .then(evaluateStep)
  .then(coachStep)
  .then(decideNextStep)
  .commit();
