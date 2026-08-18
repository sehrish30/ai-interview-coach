import { describe, expect, it } from "vitest";
import {
  computeAnswerScore,
  computeCategoryScores,
  computeOverallScore,
  deriveReadinessLevel,
} from "@/server/services/scoring";
import type { EvaluationOutput } from "@/mastra/schemas/evaluation";
import type { InterviewPlan } from "@/mastra/schemas/interviewer";

const baseScores: EvaluationOutput["scores"] = {
  relevance: 80,
  completeness: 80,
  specificity: 80,
  evidence: 80,
  structure: 80,
  communication: 80,
  roleAlignment: 80,
  technicalAccuracy: null,
  starQuality: null,
};

describe("computeAnswerScore", () => {
  it("returns the flat 80 when all base dimensions are 80 and no specialist scores apply", () => {
    const { answerScore } = computeAnswerScore(baseScores);
    expect(answerScore).toBe(80);
  });

  it("blends in technicalAccuracy without penalizing the base dimensions' weight sum", () => {
    const { answerScore, appliedWeights } = computeAnswerScore({
      ...baseScores,
      technicalAccuracy: 100,
    });
    // All base dims at 80, technicalAccuracy at 100 pulls the result above 80.
    expect(answerScore).toBeGreaterThan(80);
    const totalWeight = Object.values(appliedWeights).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it("blends in both technicalAccuracy and starQuality with weights still summing to 1", () => {
    const { appliedWeights } = computeAnswerScore({
      ...baseScores,
      technicalAccuracy: 90,
      starQuality: 70,
    });
    const totalWeight = Object.values(appliedWeights).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });
});

const plan: InterviewPlan = {
  interviewTitle: "Test plan",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  totalQuestions: 3,
  categories: [
    { name: "Technical", weight: 50, objectives: [], targetQuestionCount: 1 },
    { name: "Behavioral", weight: 30, objectives: [], targetQuestionCount: 1 },
    { name: "Leadership", weight: 20, objectives: [], targetQuestionCount: 1 },
  ],
  focusAreas: [],
  riskAreas: [],
  coachingPriorities: [],
};

describe("computeCategoryScores", () => {
  it("redistributes weight away from categories with zero answered questions", () => {
    const answersByCategory = new Map([
      ["Technical", [90]],
      ["Behavioral", [70]],
      // Leadership never answered (interview ended early)
    ]);
    const result = computeCategoryScores(plan, answersByCategory);
    expect(result.map((r) => r.category)).toEqual(["Technical", "Behavioral"]);
    // Original weights were 50/30 out of 80 active -> renormalized to 100
    const technical = result.find((r) => r.category === "Technical")!;
    const behavioral = result.find((r) => r.category === "Behavioral")!;
    expect(technical.weight + behavioral.weight).toBeCloseTo(100, 5);
    expect(technical.weight).toBeGreaterThan(behavioral.weight);
  });

  it("averages multiple answers within the same category", () => {
    const answersByCategory = new Map([["Technical", [80, 100]]]);
    const result = computeCategoryScores(plan, answersByCategory);
    expect(result[0]!.score).toBe(90);
    expect(result[0]!.answerCount).toBe(2);
  });
});

describe("computeOverallScore", () => {
  it("returns 0 when there are no category scores", () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it("applies category weights as a weighted average", () => {
    const overall = computeOverallScore([
      { category: "A", score: 100, weight: 50, answerCount: 1 },
      { category: "B", score: 0, weight: 50, answerCount: 1 },
    ]);
    expect(overall).toBe(50);
  });
});

describe("deriveReadinessLevel", () => {
  it.each([
    [10, "not-ready"],
    [50, "developing"],
    [70, "nearly-ready"],
    [85, "interview-ready"],
    [95, "highly-competitive"],
  ] as const)("maps score %d to %s", (score, expected) => {
    expect(deriveReadinessLevel(score)).toBe(expected);
  });
});
