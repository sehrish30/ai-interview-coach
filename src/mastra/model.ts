/**
 * Central place every agent reads its model from, so switching providers
 * is a single environment variable change (AI_MODEL="openai/gpt-5.1",
 * "anthropic/claude-...", etc.) rather than an edit per agent file.
 */
export function getAgentModel(): string {
  return process.env.AI_MODEL ?? "openai/gpt-5.1";
}
