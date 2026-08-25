import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { getSession, transitionSessionStatus } from "@/server/repositories/session-repository";
import { preparationWorkflow } from "@/mastra/workflows/preparation-workflow";
import { handleApiError, apiError } from "@/lib/api-response";

const prepareSchema = z.object({
  resumeText: z.string().min(50, "Resume text is too short to analyze").max(20000),
  jobDescriptionText: z.string().min(50, "Job description text is too short to analyze").max(20000),
});

function summarizeWorkflowError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    await requireUser(supabase);
    const body = prepareSchema.parse(await request.json());

    const session = await getSession(supabase, id).catch(() => null);
    if (!session) return apiError(404, "not_found", "Interview session not found");

    // Ownership is already enforced by RLS on the read above; transition
    // validity is enforced deterministically here.
    await transitionSessionStatus(supabase, id, "preparing");

    try {
      const run = await preparationWorkflow.createRun();
      const result = await run.start({
        inputData: {
          sessionId: id,
          resumeText: body.resumeText,
          jobDescriptionText: body.jobDescriptionText,
        },
      });

      if (result.status !== "success") {
        await transitionSessionStatus(supabase, id, "failed", {
          failureReason:
            result.status === "failed" ? summarizeWorkflowError(result.error) : result.status,
        });
        return apiError(502, "preparation_failed", "Interview preparation failed");
      }

      return NextResponse.json(result.result);
    } catch (workflowError) {
      await transitionSessionStatus(supabase, id, "failed", {
        failureReason:
          workflowError instanceof Error ? workflowError.message : String(workflowError),
      });
      throw workflowError;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
