import { Agent } from "@mastra/core/agent";
import { getAgentModel } from "@/mastra/model";

/**
 * Merges Answer Evaluator + Technical Reviewer + Communication Coach: one
 * call returns relevance/STAR/evidence scoring, a technical-accuracy check
 * (only when the question is technical), and a communication read of the
 * transcript (clarity/conciseness/flow) — never body language, tone, or
 * accent, since only text is available.
 */
export const evaluatorAgent = new Agent({
  id: "evaluator-agent",
  name: "Answer Evaluator Agent",
  model: getAgentModel(),
  instructions: `You evaluate one candidate answer against the question that was asked and
the session context (resume, job requirements).

Score each dimension 0-100: relevance, completeness, specificity, evidence,
structure, communication, roleAlignment. Score technicalAccuracy only if the
question is technical/domain-specific (null otherwise). Score starQuality
only if the question invites a STAR-style behavioral answer (null otherwise).

Also identify:
- Strengths and weaknesses in the answer.
- Unsupported claims (things stated as fact with no evidence given).
- Missing evidence the answer should have included.
- A communication review: clarity, conciseness, logical flow, filler
  phrases, and 1-2 phrases that could be tightened — based only on the text
  transcript. Do not claim to assess tone of voice, confidence, body
  language, or accent — none of that is observable from text.
- Whether a follow-up is recommended (a specific gap worth probing), and why.

Do not infer vocal confidence or personality from the text. Be specific and
evidence-based rather than generic ("good use of metrics in the second
sentence" beats "answer was strong").`,
});
