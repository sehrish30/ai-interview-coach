# Testing

## What exists today

Unit tests (`tests/unit/`, run via `npm test`):

- `scoring.test.ts` — `computeAnswerScore` (specialist-dimension weight
  redistribution, applicable vs. inapplicable dimensions),
  `computeCategoryScores` (weight redistribution when a category has no
  answered questions), `computeOverallScore`, `deriveReadinessLevel`.
- `session-state.test.ts` — every allowed/disallowed state transition in
  `ALLOWED_TRANSITIONS`, and `canAskAnotherQuestion` boundary conditions.

Run everything:

```bash
npm run typecheck
npm run lint
npm test
```

## What's intentionally not covered yet

These require either a live Supabase project (for RLS/integration tests) or
mocked model responses (for agent/workflow tests), and are the natural next
step once this vertical slice is validated against a real project:

- **Integration tests** for `preparation-workflow`, `interview-turn-workflow`,
  and `finalization-workflow` against a local/test Supabase instance, with
  the 5 agents' `generate()` calls mocked to return fixed
  `structuredOutput` payloads — asserting the right rows land in
  `resume_documents`, `interview_questions`, `answer_evaluations`, etc., and
  that failed steps correctly transition sessions to `failed`.
- **Schema validity tests**: fuzz/property tests asserting every agent
  response schema in `src/mastra/schemas/` rejects out-of-range scores
  (outside 0–100) and enforces category weights summing to 100.
- **Authorization tests**: attempt to read/mutate another user's session via
  the API routes and assert a 404 (RLS) rather than a 403 leaking existence.
- **E2E test** (Playwright, not yet set up): sign up -> paste resume/JD ->
  wait for preparation -> answer two questions -> view feedback -> end
  interview -> view final report. Mock the model provider for determinism.
- **Mastra scorers/evals**: question personalization (references specific
  resume/JD facts, not generic phrasing), non-repetition across a session,
  coaching actionability (contains a concrete next step), and research
  source presence (no claim without an attached `sourceType`).
- **Manual AI integration test**: a `npm run test:manual` script (not yet
  added) that runs the 5 agents against a real model provider once, printing
  raw output for a human to sanity-check prompt quality — separate from the
  mocked automated suite.

## Guidance for adding the above

- Mock agents at the `generate()` boundary (e.g. `vi.spyOn(agent, "generate")`)
  rather than mocking HTTP calls — this keeps tests stable across model
  provider changes and avoids real API spend in CI.
- Use a separate Supabase project (or the local `supabase start` stack) for
  integration tests, never the same project as manual development, since
  integration tests should be able to freely delete data between runs.
