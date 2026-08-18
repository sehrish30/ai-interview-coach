import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SessionStatus } from "@/types/db-helpers";
import { assertValidTransition } from "@/server/services/session-state";

type Client = SupabaseClient<Database>;

export interface CreateSessionInput {
  userId: string;
  targetRole: string;
  targetCompany?: string | null;
  seniority?: string | null;
  interviewMode?: string;
  difficulty?: string;
  maxQuestions?: number;
  maxFollowUpsPerQuestion?: number;
  researchEnabled?: boolean;
}

export async function createSession(client: Client, input: CreateSessionInput) {
  const { data, error } = await client
    .from("interview_sessions")
    .insert({
      user_id: input.userId,
      target_role: input.targetRole,
      target_company: input.targetCompany ?? null,
      seniority: input.seniority ?? null,
      interview_mode: input.interviewMode ?? "practice",
      difficulty: input.difficulty ?? "intermediate",
      max_questions: input.maxQuestions ?? 5,
      max_follow_ups_per_question: input.maxFollowUpsPerQuestion ?? 1,
      research_enabled: input.researchEnabled ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSession(client: Client, sessionId: string) {
  const { data, error } = await client
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data;
}

export async function transitionSessionStatus(
  client: Client,
  sessionId: string,
  to: SessionStatus,
  extra?: { failureReason?: string },
) {
  const current = await getSession(client, sessionId);
  assertValidTransition(current.status, to);

  const { data, error } = await client
    .from("interview_sessions")
    .update({ status: to, failure_reason: extra?.failureReason ?? null })
    .eq("id", sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function incrementQuestionIndex(client: Client, sessionId: string) {
  const current = await getSession(client, sessionId);
  const { data, error } = await client
    .from("interview_sessions")
    .update({ current_question_index: current.current_question_index + 1 })
    .eq("id", sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listSessionsForUser(client: Client, userId: string) {
  const { data, error } = await client
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
