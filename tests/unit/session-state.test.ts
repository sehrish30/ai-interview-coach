import { describe, expect, it } from "vitest";
import {
  assertValidTransition,
  canAskAnotherQuestion,
  InvalidSessionTransitionError,
} from "@/server/services/session-state";
import type { SessionStatus } from "@/types/db-helpers";

describe("assertValidTransition", () => {
  const validTransitions: [SessionStatus, SessionStatus][] = [
    ["draft", "preparing"],
    ["preparing", "ready"],
    ["ready", "in_progress"],
    ["in_progress", "paused"],
    ["in_progress", "completed"],
    ["paused", "in_progress"],
    ["failed", "preparing"],
  ];

  it.each(validTransitions)("allows %s -> %s", (from, to) => {
    expect(() => assertValidTransition(from, to)).not.toThrow();
  });

  const invalidTransitions: [SessionStatus, SessionStatus][] = [
    ["draft", "in_progress"],
    ["completed", "in_progress"],
    ["completed", "draft"],
    ["ready", "completed"],
    ["paused", "completed"],
  ];

  it.each(invalidTransitions)("rejects %s -> %s", (from, to) => {
    expect(() => assertValidTransition(from, to)).toThrow(InvalidSessionTransitionError);
  });
});

describe("canAskAnotherQuestion", () => {
  it("allows another question below the max", () => {
    expect(canAskAnotherQuestion({ currentQuestionIndex: 2, maxQuestions: 5 })).toBe(true);
  });

  it("disallows another question at the max", () => {
    expect(canAskAnotherQuestion({ currentQuestionIndex: 5, maxQuestions: 5 })).toBe(false);
  });
});
