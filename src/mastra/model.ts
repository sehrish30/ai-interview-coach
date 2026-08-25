export function getAgentModel(): string {
  return process.env.AI_MODEL ?? "google/gemini-3.6-flash";
}
