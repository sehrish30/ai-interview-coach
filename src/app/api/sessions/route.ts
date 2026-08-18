import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { createSession, listSessionsForUser } from "@/server/repositories/session-repository";
import { handleApiError } from "@/lib/api-response";

const createSessionSchema = z.object({
  targetRole: z.string().min(1).max(200),
  targetCompany: z.string().max(200).nullable().optional(),
  seniority: z.string().max(100).nullable().optional(),
  interviewMode: z
    .enum(["practice", "realistic", "rapid-fire", "deep-dive", "behavioral", "technical"])
    .default("practice"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  maxQuestions: z.number().min(1).max(5).default(5),
  maxFollowUpsPerQuestion: z.number().min(0).max(1).default(1),
  researchEnabled: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);
    const body = createSessionSchema.parse(await request.json());

    const session = await createSession(supabase, {
      userId: user.id,
      targetRole: body.targetRole,
      targetCompany: body.targetCompany,
      seniority: body.seniority,
      interviewMode: body.interviewMode,
      difficulty: body.difficulty,
      maxQuestions: body.maxQuestions,
      maxFollowUpsPerQuestion: body.maxFollowUpsPerQuestion,
      researchEnabled: body.researchEnabled,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);
    const sessions = await listSessionsForUser(supabase, user.id);
    return NextResponse.json(sessions);
  } catch (error) {
    return handleApiError(error);
  }
}
