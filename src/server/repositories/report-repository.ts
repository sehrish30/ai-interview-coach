import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Upsert, not insert: final_reports.session_id is unique, and the report
 * page can legitimately trigger finalizationWorkflow concurrently (a
 * double-click on "View final report," a dev-mode double-render). A plain
 * insert throws an uncaught unique-constraint violation straight out of
 * the Server Component on the second call; upserting just overwrites with
 * the (equivalent, deterministically-scored) report instead. */
export async function saveFinalReport(
  client: Client,
  input: { sessionId: string; overallScore: number; readinessLevel: string; report: Json },
) {
  const { data, error } = await client
    .from("final_reports")
    .upsert(
      {
        session_id: input.sessionId,
        overall_score: input.overallScore,
        readiness_level: input.readinessLevel,
        report: input.report,
      },
      { onConflict: "session_id" },
    )
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
