import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface RunAndLogParams<T> {
  sessionId: string | null;
  agentName: string;
  model: string;
  /** Short, non-sensitive description of what was sent — never the full
   * resume/answer text (spec: avoid logging full resumes/answers in plain logs). */
  inputSummary: string;
  run: () => Promise<T>;
  /** Short, non-sensitive description of the result. */
  summarize: (result: T) => string;
}

/**
 * Wraps an agent invocation with observability tracing (spec section 14):
 * records agent name, timing, success/failure, and redacted summaries to
 * agent_runs. Deterministic infrastructure code, not itself an agent.
 */
export async function runAndLogAgent<T>(params: RunAndLogParams<T>): Promise<T> {
  const startedAt = new Date();
  const supabase = createSupabaseServiceRoleClient();

  try {
    const result = await params.run();
    const finishedAt = new Date();
    await supabase.from("agent_runs").insert({
      session_id: params.sessionId,
      agent_name: params.agentName,
      status: "success",
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      model: params.model,
      input_summary: params.inputSummary,
      output_summary: params.summarize(result),
    });
    return result;
  } catch (error) {
    const finishedAt = new Date();
    await supabase.from("agent_runs").insert({
      session_id: params.sessionId,
      agent_name: params.agentName,
      status: "error",
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      model: params.model,
      input_summary: params.inputSummary,
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
