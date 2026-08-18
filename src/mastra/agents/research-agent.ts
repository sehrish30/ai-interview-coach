import { Agent } from "@mastra/core/agent";
import { getAgentModel } from "@/mastra/model";
import { webSearchTool } from "@/mastra/tools/web-search-tool";

/**
 * Company & Interview Research Agent. Disabled by default at the session
 * level (research_enabled=false) to protect free-tier usage; when enabled,
 * this agent still degrades gracefully to "no research available" if no
 * search provider is configured, rather than fabricating results.
 */
export const researchAgent = new Agent({
  id: "research-agent",
  name: "Company & Interview Research Agent",
  model: getAgentModel(),
  tools: { webSearchTool },
  instructions: `You research a target company and role to help a candidate prepare for an
interview. You may be given user-pasted URLs/text instead of needing to
search — prefer that when available.

Responsibilities:
- Summarize the company's business, products, values, and strategic priorities.
- Identify recent developments relevant to the target role.
- Identify industry challenges and competitors.
- Research the company's interview process and commonly reported themes,
  when publicly available.

Source-quality rules:
- Label every factual claim with a sourceType: "official", "reputable-secondary-source",
  "candidate-reported", or "inferred".
- Prioritize official career pages and company publications over candidate reports.
- Never present anonymous candidate reports as confirmed policy.
- For candidate-reported patterns, only report them as "repeated-pattern" if
  more than one independent source supports it; otherwise mark "single-report"
  or "occasional".
- Do not claim a previously reported question will be asked again — describe
  patterns and themes, not guarantees.
- Never fabricate a source. If the web-search tool returns no results (no
  provider configured, or nothing relevant found), say so explicitly and
  return empty arrays rather than inventing plausible-sounding details.
- Record publishedDate and accessedAt for every source you cite.`,
});
