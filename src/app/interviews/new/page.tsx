"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseApiError } from "@/lib/parse-api-error";

type Stage = "form" | "preparing" | "error";

export default function NewInterviewPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [interviewMode, setInterviewMode] = useState("practice");
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeParseStatus, setResumeParseStatus] = useState<"idle" | "parsing" | "error">("idle");
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);

  async function handleResumeFile(file: File) {
    setResumeFileName(file.name);
    setResumeParseStatus("parsing");
    setResumeParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const { code, message } = await parseApiError(res);
        if (code === "unauthorized") {
          router.push("/login");
          return;
        }
        throw new Error(message);
      }
      const body = await res.json();
      setResumeText(body.text);
      setResumeParseStatus("idle");
    } catch (err) {
      setResumeParseStatus("error");
      setResumeParseError(err instanceof Error ? err.message : "Could not parse this PDF");
    }
  }

  async function prepare(id: string) {
    const res = await fetch(`/api/sessions/${id}/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, jobDescriptionText }),
    });
    if (!res.ok) {
      const { code, message } = await parseApiError(res);
      if (code === "unauthorized") {
        router.push("/login");
        return;
      }
      setStage("error");
      setError(message);
      return;
    }
    router.push(`/interviews/${id}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStage("preparing");
    setError(null);

    try {
      let id = sessionId;
      if (!id) {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRole,
            targetCompany: targetCompany || null,
            difficulty,
            interviewMode,
            maxQuestions,
            researchEnabled,
          }),
        });
        if (!res.ok) {
          const { code, message } = await parseApiError(res);
          if (code === "unauthorized") {
            router.push("/login");
            return;
          }
          throw new Error(message);
        }
        const created = await res.json();
        id = created.id;
        setSessionId(id);
      }
      await prepare(id!);
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (stage === "preparing") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-(--accent) border-t-transparent" />
        <p className="font-medium">Analyzing your resume, matching it to the role…</p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          This runs the Intake &amp; Analysis agent, optional company research, and builds your
          interview plan. Usually takes under a minute.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">New interview</h1>
      {stage === "error" && (
        <div className="mb-6 rounded-md border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}{" "}
          {sessionId && (
            <button
              type="button"
              className="underline"
              onClick={() => sessionId && prepare(sessionId)}
            >
              Retry
            </button>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Target role
            <input
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="rounded-md border border-(--border) bg-transparent px-3 py-2"
              placeholder="Senior Backend Engineer"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Target company (optional)
            <input
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              className="rounded-md border border-(--border) bg-transparent px-3 py-2"
              placeholder="Acme Corp"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span>Resume (paste text or upload PDF)</span>
            <label className="cursor-pointer rounded-md border border-(--border) bg-(--surface) px-3 py-1 text-xs font-medium text-(--accent)">
              {resumeParseStatus === "parsing" ? "Parsing…" : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={resumeParseStatus === "parsing"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleResumeFile(file);
                }}
              />
            </label>
          </div>
          <textarea
            required
            minLength={50}
            rows={8}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="rounded-md border border-(--border) bg-transparent px-3 py-2"
          />
          {resumeFileName && resumeParseStatus === "idle" && (
            <p className="text-xs text-black/50 dark:text-white/50">
              Parsed {resumeFileName} — {resumeText.length.toLocaleString()} characters. Feel free to
              edit before continuing.
            </p>
          )}
          {resumeParseStatus === "error" && (
            <p className="text-xs text-red-600 dark:text-red-400">{resumeParseError}</p>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Job description (paste text)
          <textarea
            required
            minLength={50}
            rows={8}
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
            className="rounded-md border border-(--border) bg-transparent px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="rounded-md border border-(--border) bg-transparent px-3 py-2"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Mode
            <select
              value={interviewMode}
              onChange={(e) => setInterviewMode(e.target.value)}
              className="rounded-md border border-(--border) bg-transparent px-3 py-2"
            >
              <option value="practice">Practice (feedback after each answer)</option>
              <option value="realistic">Realistic (feedback at the end)</option>
              <option value="behavioral">Behavioral focus</option>
              <option value="technical">Technical focus</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Questions
            <input
              type="number"
              min={1}
              max={5}
              value={maxQuestions}
              onChange={(e) => setMaxQuestions(Number(e.target.value))}
              className="rounded-md border border-(--border) bg-transparent px-3 py-2"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={researchEnabled}
            onChange={(e) => setResearchEnabled(e.target.checked)}
          />
          Enable company research (uses extra model calls; disabled by default)
        </label>

        <button
          type="submit"
          className="w-fit rounded-md bg-(--accent) px-5 py-2.5 font-medium text-white"
        >
          Start preparation
        </button>
      </form>
    </main>
  );
}
