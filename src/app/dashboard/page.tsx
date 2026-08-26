import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listSessionsForUser } from "@/server/repositories/session-repository";
import { DeleteSessionButton } from "@/components/interview/delete-session-button";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  preparing: "Preparing…",
  ready: "Ready to start",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessions = await listSessionsForUser(supabase, user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your interview sessions</h1>
        <Link
          href="/interviews/new"
          className="rounded-md bg-(--accent) px-4 py-2 text-sm font-medium text-white"
        >
          New interview
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          No sessions yet. Start your first practice interview.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-(--border) p-4"
            >
              <div>
                <p className="font-medium">
                  {s.target_role}
                  {s.target_company ? ` @ ${s.target_company}` : ""}
                </p>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {STATUS_LABEL[s.status] ?? s.status}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={s.status === "completed" ? `/interviews/${s.id}/report` : `/interviews/${s.id}`}
                  className="text-sm font-medium text-(--accent) underline underline-offset-2"
                >
                  {s.status === "completed" ? "View report" : "Continue"}
                </Link>
                <DeleteSessionButton
                  sessionId={s.id}
                  label={s.target_company ? `${s.target_role} @ ${s.target_company}` : s.target_role}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
