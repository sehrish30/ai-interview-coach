import type { StoredReport } from "@/lib/report-types";

/** Deterministic formatting — never delegated to an agent (same principle
 * as scoring.ts: the numbers and structure are already decided; this just
 * renders them as text). */
export function formatReportAsMarkdown(input: {
  targetRole: string;
  targetCompany: string | null;
  readinessLevel: string;
  report: StoredReport;
}): string {
  const { targetRole, targetCompany, readinessLevel, report } = input;
  const { narrative } = report;
  const title = targetCompany ? `${targetRole} @ ${targetCompany}` : targetRole;
  const lines: string[] = [];

  lines.push(`# ${title} — Interview Report`, "");
  lines.push(`**Overall score:** ${report.overallScore}/100`);
  lines.push(`**Readiness:** ${readinessLevel}`);
  lines.push(`**Recommendation:** ${narrative.recommendation}`, "");
  lines.push(narrative.recommendationExplanation, "");

  lines.push("## Category breakdown");
  for (const c of report.categoryScores) {
    lines.push(`- ${c.category} — ${c.score}/100 (weight ${c.weight}%)`);
  }
  lines.push("");

  lines.push("## Strongest competencies");
  for (const s of narrative.strongestCompetencies) lines.push(`- ${s}`);
  lines.push("");

  lines.push("## Development areas");
  for (const d of narrative.developmentAreas) lines.push(`- ${d}`);
  lines.push("");

  lines.push("## 7-day preparation plan");
  for (const day of narrative.sevenDayPlan) {
    lines.push(`### Day ${day.day}: ${day.focus}`);
    for (const action of day.actions) lines.push(`- ${action}`);
    lines.push("");
  }

  lines.push("## Question-by-question");
  report.answerSummaries.forEach((a, i) => {
    lines.push(`### ${i + 1}. ${a.category} — ${a.answerScore}/100`);
    lines.push(`**Q:** ${a.questionText}`, "");
    if (a.strengths.length > 0) lines.push(`**Strengths:** ${a.strengths.join("; ")}`);
    if (a.weaknesses.length > 0) lines.push(`**Weaknesses:** ${a.weaknesses.join("; ")}`);
    lines.push("");
  });

  if (narrative.suggestedCandidateQuestions.length > 0) {
    lines.push("## Questions to ask the interviewer");
    for (const q of narrative.suggestedCandidateQuestions) lines.push(`- ${q}`);
    lines.push("");
  }

  if (narrative.limitations.length > 0) {
    lines.push("## Limitations");
    for (const l of narrative.limitations) lines.push(`- ${l}`);
    lines.push("");
  }

  lines.push("---", "", report.disclaimer);

  return lines.join("\n");
}
