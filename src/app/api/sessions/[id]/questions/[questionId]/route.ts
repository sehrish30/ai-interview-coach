import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { getSession } from "@/server/repositories/session-repository";
import { getAnswerDetailForQuestion } from "@/server/repositories/interview-repository";
import { computeAnswerScore } from "@/server/services/scoring";
import { handleApiError, apiError } from "@/lib/api-response";
import type { EvaluationOutput } from "@/mastra/schemas/evaluation";
import type { CoachingOutput } from "@/mastra/schemas/coaching";

/** Read-only lookup of a single already-answered question, for the sidebar's
 * "review a past answer" panel — never used to re-submit or edit anything. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  try {
    const { id, questionId } = await params;
    const supabase = await createSupabaseServerClient();
    await requireUser(supabase);

    // RLS scopes this to the caller's own session.
    const session = await getSession(supabase, id).catch(() => null);
    if (!session) return apiError(404, "not_found", "Interview session not found");

    const detail = await getAnswerDetailForQuestion(supabase, questionId);
    if (!detail || detail.question.session_id !== id) {
      return apiError(404, "not_found", "This question hasn't been answered yet");
    }

    const evaluation = detail.evaluation?.evaluation as EvaluationOutput | undefined;
    const answerScore = evaluation ? computeAnswerScore(evaluation.scores).answerScore : null;

    return NextResponse.json({
      question: {
        text: detail.question.text,
        category: detail.question.category,
        difficulty: detail.question.difficulty,
        isFollowUp: detail.question.is_follow_up,
      },
      answerText: detail.answer.answer_text,
      answerScore,
      evaluation: evaluation ?? null,
      coaching: (detail.coaching?.feedback as CoachingOutput | undefined) ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
