import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { getSession } from "@/server/repositories/session-repository";
import { getFinalReport } from "@/server/repositories/report-repository";
import { finalizationWorkflow } from "@/mastra/workflows/finalization-workflow";
import { handleApiError, apiError } from "@/lib/api-response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    await requireUser(supabase);

    const session = await getSession(supabase, id).catch(() => null);
    if (!session) return apiError(404, "not_found", "Interview session not found");
    if (session.status !== "completed") {
      return apiError(409, "invalid_state", "Interview is not completed yet");
    }

    const existing = await getFinalReport(supabase, id).catch(() => null);
    if (existing) return NextResponse.json(existing);

    const run = await finalizationWorkflow.createRun();
    const result = await run.start({ inputData: { sessionId: id } });
    if (result.status !== "success") {
      return apiError(502, "finalization_failed", "Generating the final report failed");
    }

    const report = await getFinalReport(supabase, id);
    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}
