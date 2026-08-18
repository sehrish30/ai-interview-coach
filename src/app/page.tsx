import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="mb-3 text-4xl font-semibold tracking-tight">AI Interview Coach</h1>
      <p className="mb-8 text-lg text-black/70 dark:text-white/70">
        Paste your resume and a job description. A multi-agent system analyzes your fit, plans a
        personalized interview, asks questions one at a time, and coaches every answer.
      </p>
      <Link
        href={user ? "/dashboard" : "/login"}
        className="w-fit rounded-md bg-(--accent) px-5 py-2.5 font-medium text-white"
      >
        {user ? "Go to dashboard" : "Get started"}
      </Link>
      <p className="mt-10 max-w-md text-xs text-black/50 dark:text-white/50">
        This application provides simulated interview practice and coaching. Its scores and
        recommendations should not be treated as real hiring decisions.
      </p>
    </main>
  );
}
