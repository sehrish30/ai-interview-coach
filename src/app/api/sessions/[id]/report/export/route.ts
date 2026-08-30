import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { getSession } from "@/server/repositories/session-repository";
import { getFinalReport } from "@/server/repositories/report-repository";
import { formatReportAsMarkdown } from "@/server/services/report-markdown";
import { handleApiError, apiError } from "@/lib/api-response";
import type { StoredReport } from "@/lib/report-types";

/** Downloads the final report as Markdown or JSON. PDF is intentionally not
 * generated server-side here — the report page's "Print / Save as PDF"
 * button uses the browser's own print-to-PDF instead of a heavy PDF-
 * generation dependency (puppeteer, etc.), consistent with this project's
 * free-tier-first / minimal-dependency approach elsewhere. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const format = request.nextUrl.searchParams.get("format");
    if (format !== "md" && format !== "json") {
      return apiError(400, "invalid_format", "format must be 'md' or 'json'");
    }

    const supabase = await createSupabaseServerClient();
    await requireUser(supabase);

    const session = await getSession(supabase, id).catch(() => null);
    if (!session) return apiError(404, "not_found", "Interview session not found");

    const reportRow = await getFinalReport(supabase, id).catch(() => null);
    if (!reportRow) {
      return apiError(404, "not_found", "No report generated for this session yet");
    }

    const report = reportRow.report as unknown as StoredReport;
    const filenameBase = session.target_role
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (format === "json") {
      return new NextResponse(JSON.stringify(report, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filenameBase}-report.json"`,
        },
      });
    }

    const markdown = formatReportAsMarkdown({
      targetRole: session.target_role,
      targetCompany: session.target_company,
      readinessLevel: reportRow.readiness_level,
      report,
    });

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}-report.md"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
