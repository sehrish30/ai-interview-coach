import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/server/repositories/session-repository";
import { getFinalReport } from "@/server/repositories/report-repository";
import { finalizationWorkflow } from "@/mastra/workflows/finalization-workflow";
import { PrintReportButton } from "@/components/reports/print-report-button";
import type { StoredReport } from "@/lib/report-types";

export default async function FinalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const session = await getSession(supabase, id).catch(() => null);
  if (!session) notFound();
  if (session.status !== "completed") redirect(`/interviews/${id}`);

  let reportRow = await getFinalReport(supabase, id).catch(() => null);
  if (!reportRow) {
    const run = await finalizationWorkflow.createRun();
    const result = await run.start({ inputData: { sessionId: id } });
    if (result.status !== "success") {
      throw new Error("Generating the final report failed");
    }
    reportRow = await getFinalReport(supabase, id);
  }

  const report = reportRow.report as unknown as StoredReport;
  const { narrative } = report;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{session.target_role} — Final Report</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Readiness: <span className="font-medium">{reportRow.readiness_level}</span> ·
            Recommendation: {narrative.recommendation}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <a
            href={`/api/sessions/${id}/report/export?format=md`}
            className="rounded-md border border-(--border) px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
          >
            Markdown
          </a>
          <a
            href={`/api/sessions/${id}/report/export?format=json`}
            className="rounded-md border border-(--border) px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
          >
            JSON
          </a>
          <PrintReportButton />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-(--border) p-6">
        <p className="text-4xl font-semibold">{report.overallScore}/100</p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">Overall score</p>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Category breakdown</h2>
        <ul className="flex flex-col gap-2">
          {report.categoryScores.map((c) => (
            <li key={c.category} className="flex items-center justify-between text-sm">
              <span>
                {c.category} <span className="text-black/50 dark:text-white/50">({c.weight}%)</span>
              </span>
              <span className="font-medium">{c.score}/100</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Strongest competencies</h2>
          <ul className="list-inside list-disc text-sm">
            {narrative.strongestCompetencies.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-semibold">Development areas</h2>
          <ul className="list-inside list-disc text-sm">
            {narrative.developmentAreas.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">7-day preparation plan</h2>
        <ol className="flex flex-col gap-2">
          {narrative.sevenDayPlan.map((d) => (
            <li key={d.day} className="rounded-md border border-(--border) p-3 text-sm">
              <p className="font-medium">
                Day {d.day}: {d.focus}
              </p>
              <ul className="mt-1 list-inside list-disc">
                {d.actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Question-by-question</h2>
        <ul className="flex flex-col gap-3">
          {report.answerSummaries.map((a, i) => (
            <li key={i} className="rounded-md border border-(--border) p-3 text-sm">
              <p className="font-medium">
                {a.category} — {a.answerScore}/100
              </p>
              <p className="mt-1 text-black/70 dark:text-white/70">{a.questionText}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-xs text-black/50 dark:text-white/50">{report.disclaimer}</p>
    </main>
  );
}
