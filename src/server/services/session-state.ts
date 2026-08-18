import type { SessionStatus } from "@/types/db-helpers";

/** Deterministic state machine — never delegated to an LLM. */
const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ["preparing", "failed"],
  preparing: ["ready", "failed"],
  ready: ["in_progress", "failed"],
  in_progress: ["paused", "completed", "failed"],
  paused: ["in_progress", "failed"],
  completed: [],
  failed: ["preparing"],
};

export class InvalidSessionTransitionError extends Error {
  constructor(from: SessionStatus, to: SessionStatus) {
    super(`Cannot transition interview session from "${from}" to "${to}"`);
    this.name = "InvalidSessionTransitionError";
  }
}

export function assertValidTransition(from: SessionStatus, to: SessionStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidSessionTransitionError(from, to);
  }
}

export function canAskAnotherQuestion(input: {
  currentQuestionIndex: number;
  maxQuestions: number;
}): boolean {
  return input.currentQuestionIndex < input.maxQuestions;
}
