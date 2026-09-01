# AI Interview Coach

A TypeScript multi-agent interview-preparation app: paste a resume and a job
description, get a personalized interview plan, answer questions one at a
time, get coached on each answer, and receive a final scored report with a
7-day improvement plan.

Built with **Mastra AI** (agents + workflows), **Next.js App Router**,
**Supabase** (Postgres + Auth + RLS), and **Zod**.

> This is a scoped "vertical slice" of a much larger master specification —
> see [Architecture](#architecture) and [Known limitations](#known-limitations)
> for what's intentionally deferred to a later pass.

## Demo

<video src="./ai-interview-demo.mp4" controls muted title="AI Interview Coach demo"></video>

If your viewer doesn't render the player above, [watch/download the demo
video directly](./ai-interview-demo.mp4) — clicking it on GitHub opens it in
their built-in video viewer.

## Feature list

- Email/password auth (Supabase Auth) with per-user Row Level Security on
  every table.
- New-interview wizard: paste resume + job description text, set role,
  company, difficulty, mode, and question count.
- Intake & Analysis agent: resume analysis, job-description analysis, and
  role-match scoring in one call, cached by content hash so re-submitting
  identical text never re-runs the model.
- Optional Company & Interview Research agent (disabled by default; degrades
  gracefully with no search provider configured).
- Interviewer agent: builds a weighted interview plan, asks one question at a
  time, decides on at most one follow-up per question, and knows when the
  interview is complete.
- Evaluator agent: scores every answer (relevance, evidence, structure,
  communication, technical accuracy when applicable, STAR quality when
  applicable) — never infers tone/body-language from text.
- Coach & Report agent: per-answer coaching in Practice mode, plus a final
  report narrative built on top of deterministically-computed scores.
- Deterministic scoring service (score arithmetic and category weighting are
  plain TypeScript, never an LLM call).
- Observability: every agent call is logged to `agent_runs` with timing and
  a redacted summary (never full resume/answer text).

## Architecture

5 Mastra agents (consolidated from a larger 15-role spec — see
[AGENTS.md](./AGENTS.md) for why), 3 Mastra workflows, deterministic
TypeScript services for anything that doesn't require language reasoning
(score math, state transitions, caching, authorization). See
[ARCHITECTURE.md](./ARCHITECTURE.md) for diagrams.

## Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project
- An OpenAI API key (or another provider supported by the Vercel AI SDK —
  change `AI_MODEL` and its matching key env var)
- The Supabase CLI (`npx supabase`, no global install required) for running
  migrations against your project

## Installation

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# SUPABASE_SECRET_KEY, and OPENAI_API_KEY in .env.local
# (Supabase's modern key pair — Settings -> API Keys — not the legacy anon/service_role keys)
```

## Database setup

Link the CLI to your Supabase project once:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

Run migrations (creates all tables, RLS policies, and the
new-user-signup trigger), then regenerate `src/types/database.ts` from the
live schema:

```bash
npm run db:push
npm run db:types
```

`src/types/database.ts` is generated output — don't hand-edit it. Whenever
you add a new migration under `supabase/migrations/`, re-run both commands
above so the types stay in sync with the real schema.

## Seed data

```bash
npm run seed
```

Creates a demo user (`demo.candidate@example.com` / `demo-password-123!`)
with one completed interview session, so the dashboard and report views have
something to show without spending model calls.

## Run the development server

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up (or sign in as the seeded demo user),
and start a new interview.

## Mastra Studio

```bash
npm run mastra:dev
```

Opens Mastra's local dev UI for inspecting agents, workflows, and runs
directly (in addition to the `agent_runs` table).

## Tests

```bash
npm run typecheck
npm run lint
npm test
```

Unit tests cover the deterministic scoring and session-state services (see
`tests/unit`). Integration/E2E coverage for the full workflows is listed as a
next step in [TESTING.md](./TESTING.md).

## Enabling voice mode

Not implemented in this pass. `ENABLE_VOICE_INTERVIEW` is reserved and
defaults to `false`; the app is fully usable through text.

## Known limitations

- **Text-only intake**: resume and job description are pasted as text, not
  uploaded as PDF/DOCX. The document-ingestion workflow, chunking, and
  vector-backed RAG from the original spec are not implemented — full text is
  passed directly to the Intake & Analysis agent, which is fine at this
  question/document volume and avoids paying for embeddings + vector storage
  on a free tier.
- **5 agents, not 15**: the original spec's 15 single-purpose agents are
  consolidated into 5 (see AGENTS.md). Functional coverage is the same;
  round trips and cost are much lower.
- **No agent network / dynamic delegation**: sequencing is 3 deterministic
  Mastra workflows, not an LLM-driven orchestrator agent — the spec itself
  calls for workflows over agent delegation for business-critical sequences.
- **Company research** is real (Mastra agent + tool), but the web-search tool
  ships with a disabled provider by default (spec requirement: no paid search
  API dependency). Wire up a real provider via `setWebSearchProvider` in
  `src/mastra/tools/web-search-tool.ts` to enable it.
- **Synchronous workflow execution**: preparation, turn, and finalization
  workflows run inline in the request instead of a background job queue —
  fine for a single-user demo, not for concurrent production traffic.
- **No development-mode agent-run debug page, no scorers/evals** — both
  listed in the original spec, reasonable next passes once this slice is
  validated. (Resume upload and report export are implemented — see below.)

## Report export

The final report page offers three export paths:

- **Markdown** and **JSON** — `GET /api/sessions/:id/report/export?format=md|json`
  returns the report as a downloadable file (`Content-Disposition: attachment`).
  Formatting logic lives in `src/server/services/report-markdown.ts` — plain
  deterministic TypeScript, not an agent call.
- **PDF** — via the browser's own "Print / Save as PDF," rather than a
  PDF-generation dependency (puppeteer, jsPDF, etc.). A `@media print` rule
  in `globals.css` forces a clean light background regardless of theme, and
  the export button row is hidden (`print:hidden`) from the printed output.

## Next enhancements

1. Document-ingestion workflow with chunking/embeddings for RAG over
   uploaded resumes/JDs (currently full text is sent directly to the
   Intake & Analysis agent, which is fine at this volume but doesn't scale
   to a knowledge base).
2. Mastra scorers/evals for question personalization, non-repetition, and
   coaching actionability.
3. Background job execution for workflows instead of inline request handling.
4. Voice mode behind `ENABLE_VOICE_INTERVIEW`.
