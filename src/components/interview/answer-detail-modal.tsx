"use client";

import { useEffect, useState } from "react";

interface AnswerDetail {
  question: {
    text: string;
    category: string;
    difficulty: string;
    isFollowUp: boolean;
  };
  answerText: string;
  answerScore: number | null;
  evaluation: {
    strengths: string[];
    weaknesses: string[];
  } | null;
  coaching: {
    sampleImprovedAnswer: string;
    practiceExercise: string;
  } | null;
}

export function AnswerDetailModal({
  sessionId,
  questionId,
  questionNumber,
  onClose,
}: {
  sessionId: string;
  questionId: string;
  questionNumber: number;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AnswerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/sessions/${sessionId}/questions/${questionId}`);
      if (cancelled) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Could not load this answer");
        return;
      }
      setDetail(await res.json());
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, questionId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-(--border) bg-(--background) p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-(--accent)">
            Q{questionNumber} (read-only)
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!error && !detail && <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>}

        {detail && (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-(--accent)">
                {detail.question.category}
                {detail.question.isFollowUp ? " · follow-up" : ""}
              </p>
              <h3 className="text-lg font-medium">{detail.question.text}</h3>
            </div>

            <div>
              <p className="mb-1 font-medium">Your answer</p>
              <p className="whitespace-pre-wrap rounded-md border border-(--border) p-3 text-black/80 dark:text-white/80">
                {detail.answerText}
              </p>
            </div>

            {detail.answerScore !== null && (
              <p className="font-medium">Score: {detail.answerScore}/100</p>
            )}

            {detail.evaluation && (
              <>
                {detail.evaluation.strengths.length > 0 && (
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">Strengths</p>
                    <ul className="list-inside list-disc">
                      {detail.evaluation.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.evaluation.weaknesses.length > 0 && (
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">Weaknesses</p>
                    <ul className="list-inside list-disc">
                      {detail.evaluation.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {detail.coaching ? (
              <div>
                <p className="mb-1 font-medium">A stronger answer might sound like</p>
                <p className="rounded-md border border-(--border) p-3">
                  {detail.coaching.sampleImprovedAnswer}
                </p>
                <p className="mt-2 font-medium">Practice exercise</p>
                <p>{detail.coaching.practiceExercise}</p>
              </div>
            ) : (
              <p className="text-xs text-black/50 dark:text-white/50">
                Detailed coaching is only generated per-answer in Practice mode.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
