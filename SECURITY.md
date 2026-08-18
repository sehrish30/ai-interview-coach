# Security

## Authorization

- Every table that stores session-derived data has Row Level Security
  enabled (`supabase/migrations/0001_init.sql`). Child tables (questions,
  answers, evaluations, coaching, reports) are scoped through a subquery
  against `interview_sessions.user_id = auth.uid()` — a user can never read
  or write another user's data even if they guess an ID.
- Every route handler calls `requireUser()`
  (`src/server/auth/require-user.ts`) before touching session data. RLS is
  the second line of defense, not the only one — route handlers don't rely
  on RLS alone to reject unauthenticated requests.
- The Supabase **service-role** client
  (`createSupabaseServiceRoleClient`, `src/lib/supabase/server.ts`) bypasses
  RLS and is used only inside Mastra workflow steps, which run after the API
  route has already authorized the request and validated the session
  belongs to the caller. It is never imported into client code (`server-only`
  guards `src/lib/supabase/server.ts`).

## Secrets

- `SUPABASE_SECRET_KEY` (Supabase's modern secret key, replacing the legacy
  `service_role` key) and `OPENAI_API_KEY` are read only via
  `getServerEnv()` (`src/lib/env.ts`), which is never imported from a
  `"use client"` file.
- `.env.local` is gitignored; `.env.example` documents required variables
  with placeholder values only.

## Fairness and safety in prompts

- The Intake & Analysis agent's instructions explicitly forbid inferring
  protected characteristics (race, religion, disability, age, nationality,
  marital/family status) and require treating employment gaps neutrally.
- The Interviewer agent's instructions forbid asking about protected
  characteristics or anything discriminatory, and forbid revealing scoring
  rubrics or "ideal" answers before the candidate responds.
- The Evaluator agent is explicitly instructed never to infer vocal
  confidence, tone, or personality from text — only what's observable in the
  transcript.
- The Coach & Report agent is explicitly instructed never to fabricate
  candidate experience; placeholders are used instead when a stronger sample
  answer would need a fact not already established.
- The final report always carries the disclaimer: "This application
  provides simulated interview practice and coaching. Its scores and
  recommendations should not be treated as real hiring decisions."

## Logging

- `runAndLogAgent` (`src/server/services/agent-run-logger.ts`) writes only
  short, redacted `input_summary`/`output_summary` strings to `agent_runs` —
  never full resume text, job description text, or candidate answers.
- Route handler errors are logged server-side via `console.error` inside
  `handleApiError`; API responses return a generic `internal_error` message
  with no stack trace or internals to the client.

## Input validation

- Every route handler validates its request body with a Zod schema before
  touching the database or calling an agent (`src/app/api/**/route.ts`).
- Resume/job-description text is length-bounded (50–20,000 chars) to keep
  a single malformed request from generating an unbounded model call.
- Session settings (`maxQuestions`, `maxFollowUpsPerQuestion`) are clamped at
  the schema level to the free-tier defaults (5 questions, 1 follow-up).

## Known gaps (tracked in README's "Known limitations")

- No file upload yet, so MIME-type/extension/size validation for uploaded
  documents (spec section 13) isn't implemented — text is pasted directly.
- No rate limiting on API routes yet; a single authenticated user could
  submit prepare/answer requests back-to-back and drive up model spend.
- No content-sanitization pass on rendered candidate text beyond React's
  default JSX escaping (no `dangerouslySetInnerHTML` is used anywhere in the
  UI, so this is currently safe by construction, but worth an explicit test
  if that ever changes).
