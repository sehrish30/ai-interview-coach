/**
 * gemini-flash-lite-latest, not gemini-3.6-flash: the latter was observed
 * under heavy provider-side load (repeated "high demand" errors and 20-35s+
 * hangs on Google's free tier), confirmed via a direct curl to the Gemini
 * API bypassing this app entirely — flash-lite responded in <1s at the same
 * time. Free-tier model availability shifts over time; if this one starts
 * struggling, check https://aistudio.google.com for current model status
 * before assuming it's a bug here.
 */
export function getAgentModel(): string {
  return process.env.AI_MODEL ?? "google/gemini-flash-lite-latest";
}

/**
 * Mastra's default retry/timeout budget for a failed model call can run to
 * 90+ seconds before giving up (observed with Gemini's free tier returning
 * transient "high demand" errors) — the whole interview turn just hangs
 * with no feedback for that long. Cap it so a real outage fails well before
 * that instead, surfacing a clear error the UI can show quickly rather than
 * a silent multi-minute stall. 35s balances that against Gemini's free tier
 * legitimately taking 20s+ to respond under load — a shorter cap (20s) was
 * tripping on real-but-slow responses, not just genuine outages.
 */
export const FAST_FAIL_MODEL_SETTINGS = {
  maxRetries: 2,
  timeout: { totalMs: 35000 },
} as const;
