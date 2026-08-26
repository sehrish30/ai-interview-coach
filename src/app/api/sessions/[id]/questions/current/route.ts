import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { getSession, transitionSessionStatus } from "@/server/repositories/session-repository";
import { listQuestionsForSession } from "@/server/repositories/interview-repository";
import { handleApiError, apiError } from "@/lib/api-response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    await requireUser(supabase);

    const session = await getSession(supabase, id).catch(() => null);
    if (!session) return apiError(404, "not_found", "Interview session not found");

    if (session.status === "ready") {
      await transitionSessionStatus(supabase, id, "in_progress");
    } else if (session.status !== "in_progress") {
      return apiError(409, "invalid_state", `Session is "${session.status}", not in progress`);
    }

    const questions = await listQuestionsForSession(supabase, id);
    const current = [...questions].reverse().find((q) => q.status === "pending");

    if (!current) {
      return apiError(404, "no_current_question", "No pending question for this session");
    }

    return NextResponse.json({
      question: current,
      questions,
      progress: {
        currentQuestionIndex: session.current_question_index,
        maxQuestions: session.max_questions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
