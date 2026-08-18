"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Matches scripts/seed.ts. Pre-filled only in development so `npm run dev`
// after `npm run seed` is a one-click sign-in; never present in a prod build.
const DEV_DEMO_EMAIL = "demo.candidate@example.com";
const DEV_DEMO_PASSWORD = "demo-password-123!";
const isDev = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState(isDev ? DEV_DEMO_EMAIL : "");
  const [password, setPassword] = useState(isDev ? DEV_DEMO_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    const { error: authError } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold">AI Interview Coach</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        {mode === "sign-in" ? "Sign in to continue practicing." : "Create an account to get started."}
      </p>
      {isDev && mode === "sign-in" && (
        <p className="mb-4 rounded-md border border-(--border) px-3 py-2 text-xs text-black/60 dark:text-white/60">
          Dev only: pre-filled with the demo account from <code>npm run seed</code>.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-(--border) bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-(--border) bg-transparent px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-(--accent) px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        className="mt-4 text-sm text-(--accent) underline underline-offset-2"
      >
        {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
