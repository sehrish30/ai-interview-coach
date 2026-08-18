import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function saveFinalReport(
  client: Client,
  input: { sessionId: string; overallScore: number; readinessLevel: string; report: Json },
) {
  const { data, error } = await client
    .from("final_reports")
    .insert({
      session_id: input.sessionId,
      overall_score: input.overallScore,
      readiness_level: input.readinessLevel,
      report: input.report,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFinalReport(client: Client, sessionId: string) {
  const { data, error } = await client
    .from("final_reports")
    .select("*")
    .eq("session_id", sessionId)
    .single();
  if (error) throw error;
  return data;
}
