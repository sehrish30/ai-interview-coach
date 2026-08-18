# Agents

The original master specification called for 15 single-purpose agents. That
was scoped down to 5 after review: several of those 15 were always invoked
together, on the same input, producing outputs the next one immediately
depended on — running them as separate model calls would only add latency
and cost without adding capability. Each agent below documents which
original roles it absorbed and why.

## Intake & Analysis Agent

**File:** `src/mastra/agents/intake-analysis-agent.ts`
**Absorbed:** Resume Analyzer + Job Description Analyzer + Role-Matching Agent
**Why merged:** role-matching strictly requires both analyses to already
exist; there's no scenario where you'd want one without the other two.

- **Inputs:** raw resume text, raw job description text.
- **Outputs:** `IntakeAnalysisOutput` — `{ resume, jobDescription, roleMatch }`
  (`src/mastra/schemas/intake-analysis.ts`).
- **Tools:** none.
- **Memory:** none (stateless, single-shot analysis).
- **Called by:** `preparation-workflow`, step `analyze-and-match`.
- **Caching:** resume/JD text is hashed (`content_hash`); identical text
  reuses the cached analysis instead of re-invoking the model.
- **Failure behavior:** the workflow step throws; `preparation-workflow`
  catches it, transitions the session to `failed` with the error message, and
  the API returns a 502. No partial analysis is persisted.

## Company & Interview Research Agent

**File:** `src/mastra/agents/research-agent.ts`
**Absorbed:** Company & Interview Research Agent (unchanged — kept standalone)
**Why standalone:** optional, disabled by default, uses a different tool
(web search) and a different cache key (normalized company + role) than
everything else.

- **Inputs:** target company, target role (from the session row).
- **Outputs:** `ResearchOutput` (`src/mastra/schemas/research.ts`) — every
  factual claim carries a `sourceType` and `confidence`.
- **Tools:** `webSearchTool` (`src/mastra/tools/web-search-tool.ts`), a
  provider-agnostic adapter that returns an empty result set when no search
  provider is configured. The agent is instructed to report "no research
  available" rather than fabricate results in that case.
- **Memory:** none.
- **Called by:** `preparation-workflow`, step `research-company` — only when
  `interview_sessions.research_enabled = true` and a target company is set.
- **Caching:** `company_profiles`, keyed by normalized company + role.
- **Failure behavior:** treated the same as any other step failure in
  `preparation-workflow` (session -> `failed`).

## Interviewer Agent

**File:** `src/mastra/agents/interviewer-agent.ts`
**Absorbed:** Interview Strategist + Question Generator + Interviewer +
Follow-up Question Agent
**Why merged:** all four are "what should happen next in this interview,"
just at different moments (plan once, then decide each turn) — same
reasoning role, different call sites.

- **Inputs (planning call):** intake analysis, optional research, session
  settings (difficulty, question count).
- **Outputs (planning call):** `InterviewPlan`
  (`src/mastra/schemas/interviewer.ts`) — category weights must sum to 100.
- **Inputs (turn call):** the plan, full question history, the latest answer
  evaluation, and remaining follow-up budget.
- **Outputs (turn call):** `InterviewTurnDecision` — follow-up y/n, the next
  question if no follow-up, and whether the interview is complete.
- **Tools:** none.
- **Memory:** `interviewMemory` (`src/mastra/memory/interview-memory.ts`),
  scoped per call via `{ resource: userId, thread: sessionId }` so one user's
  sessions never leak into another's context.
- **Called by:** `preparation-workflow` (plan + first question),
  `interview-turn-workflow` step `decide-next` (every subsequent turn).
- **Failure behavior:** `interview-turn-workflow`'s `decide-next` step marks
  the session `completed` if the agent returns neither a follow-up nor a next
  question, rather than leaving the candidate stuck with nothing to answer.

## Evaluator Agent

**File:** `src/mastra/agents/evaluator-agent.ts`
**Absorbed:** Answer Evaluator + Technical Reviewer + Communication Coach
**Why merged:** one answer, one evaluation pass — technical/communication
sub-scores are simply null when not applicable to the question type, per the
spec's own "don't penalize inapplicable dimensions" rule.

- **Inputs:** the question (text, category, difficulty), the candidate's
  answer text.
- **Outputs:** `EvaluationOutput` (`src/mastra/schemas/evaluation.ts`).
  `technicalAccuracy` is null for non-technical questions; `starQuality` is
  null when STAR doesn't apply.
- **Tools:** none.
- **Memory:** none (each answer is evaluated independently of prior turns).
- **Called by:** `interview-turn-workflow`, step `record-and-evaluate`.
- **Failure behavior:** step throws, `interview-turn-workflow` fails the
  whole turn; no answer score is persisted without a matching evaluation row
  (`answer_evaluations.answer_id` is unique + not null).

## Interview Coach & Report Agent

**File:** `src/mastra/agents/coach-report-agent.ts`
**Absorbed:** Interview Coach + Final Scoring Agent (interpretation only) +
Report Generator
**Why merged:** both calls are "explain these already-computed facts in a
useful, encouraging way" — one per answer, one at session end. Score
*arithmetic* is never delegated to this (or any) agent — see
`src/server/services/scoring.ts`.

- **Inputs (per-answer call):** one `EvaluationOutput`.
- **Outputs (per-answer call):** `CoachingOutput`
  (`src/mastra/schemas/coaching.ts`) — STAR breakdown, improved answer
  outline, a sample improved answer built only from facts already known
  about the candidate (explicitly instructed never to fabricate experience).
- **Inputs (final call):** deterministically-computed overall score,
  category scores, readiness level, and per-answer summaries.
- **Outputs (final call):** `ReportNarrative`
  (`src/mastra/schemas/report.ts`) — readiness level, recommendation (always
  paired with an explicit "this is simulated coaching, not a real hiring
  decision" statement), 7-day plan, limitations.
- **Tools:** none.
- **Memory:** none.
- **Called by:** `interview-turn-workflow` step `coach-if-practice` (only in
  Practice mode), `finalization-workflow` step `narrate-and-save`.
- **Failure behavior:** per-answer coaching failure fails that turn; final
  narrative failure fails `GET /api/sessions/:id/report` with a 502 — the
  underlying deterministic scores are already computed and safe to retry
  against.

## Delegation model

There is intentionally **no LLM orchestrator/router agent**. Sequencing
across all three workflows (preparation, interview-turn, finalization) is
plain Mastra `createStep`/`createWorkflow` chains in
`src/mastra/workflows/`, calling the 5 agents above in a fixed order. The
spec itself calls for deterministic workflows over agent-network delegation
for business-critical sequences — an LLM deciding "what's the interview
plan's job vs. the question generator's job" would add cost and
non-determinism with no compensating benefit here, since the sequence never
actually branches on open-ended reasoning.
