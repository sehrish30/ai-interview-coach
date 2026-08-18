import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { getSession } from "@/server/repositories/session-repository";
import { getQuestion } from "@/server/repositories/interview-repository";
import { interviewTurnWorkflow } from "@/mastra/workflows/interview-turn-workflow";
import { handleApiError, apiError } from "@/lib/api-response";

const submitAnswerSchema = z.object({
  questionId: z.uuid(),
  answerText: z.string().min(1).max(8000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    await requireUser(supabase);
    const body = submitAnswerSchema.parse(await request.json());

    const session = await getSession(supabase, id).catch(() => null);
    if (!session) return apiError(404, "not_found", "Interview session not found");
    if (session.status !== "in_progress") {
      return apiError(409, "invalid_state", `Session is "${session.status}", not in progress`);
    }

    const question = await getQuestion(supabase, body.questionId).catch(() => null);
    if (!question || question.session_id !== id) {
      return apiError(404, "not_found", "Question not found for this session");
    }
    if (question.status !== "pending") {
      return apiError(409, "already_answered", "This question has already been answered");
    }

    const run = await interviewTurnWorkflow.createRun();
    const result = await run.start({
      inputData: { sessionId: id, questionId: body.questionId, answerText: body.answerText },
    });

    if (result.status !== "success") {
      return apiError(502, "turn_failed", "Processing this answer failed");
    }

    const { nextQuestionId, ...rest } = result.result;
    const nextQuestion = nextQuestionId ? await getQuestion(supabase, nextQuestionId) : null;

    return NextResponse.json({ ...rest, nextQuestion });
  } catch (error) {
    return handleApiError(error);
  }
}
