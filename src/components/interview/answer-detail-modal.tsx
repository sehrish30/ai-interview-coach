"use client";

import { useEffect, useState } from "react";
import { PriorityBadge } from "@/components/interview/priority-badge";
import { ScoreBadge } from "@/components/interview/score-badge";
import { FeedbackList } from "@/components/interview/feedback-list";

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
    improvedAnswerOutline: string[];
    sampleImprovedAnswer: string;
    practiceExercise: string;
    priority: "low" | "medium" | "high";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-(--border) bg-(--background) shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stays put while the body scrolls, so context never gets lost. */}
        <div className="flex shrink-0 items-center justify-between border-b border-(--border) bg-(--background) px-6 py-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              Question {questionNumber}
              {detail?.question.isFollowUp ? " · follow-up" : ""}
            </p>
            <span className="rounded-full border border-(--border) px-2 py-0.5 text-xs text-black/50 dark:text-white/50">
              Read-only
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!error && !detail && (
            <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>
          )}

          {detail && (
            <div className="flex flex-col gap-5 text-sm">
              <section>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-(--accent) uppercase">
                  {detail.question.category}
                </p>
                <h3 className="text-lg leading-snug font-medium">{detail.question.text}</h3>
              </section>

              <section className="border-t border-(--border) pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">Your answer</p>
                  {detail.answerScore !== null && <ScoreBadge score={detail.answerScore} />}
                </div>
                <p className="rounded-lg bg-(--surface) p-3 whitespace-pre-wrap text-black/80 dark:text-white/80">
                  {detail.answerText}
                </p>
              </section>

              {detail.evaluation &&
                (detail.evaluation.strengths.length > 0 ||
                  detail.evaluation.weaknesses.length > 0) && (
                  <section className="grid gap-4 border-t border-(--border) pt-5 sm:grid-cols-2">
                    {detail.evaluation.strengths.length > 0 && (
                      <FeedbackList
                        title="Strengths"
                        items={detail.evaluation.strengths}
                        tone="positive"
                      />
                    )}
                    {detail.evaluation.weaknesses.length > 0 && (
                      <FeedbackList
                        title="Weaknesses"
                        items={detail.evaluation.weaknesses}
                        tone="negative"
                      />
                    )}
                  </section>
                )}

              <section className="border-t border-(--border) pt-5">
                {detail.coaching ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Coaching</p>
                      <PriorityBadge priority={detail.coaching.priority} />
                    </div>

                    {detail.coaching.improvedAnswerOutline.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium tracking-wide text-black/50 uppercase dark:text-white/50">
                          Suggested outline
                        </p>
                        <ol className="flex flex-col gap-1">
                          {detail.coaching.improvedAnswerOutline.map((step, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-black/40 dark:text-white/40">{i + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div>
                      <p className="mb-1.5 text-xs font-medium tracking-wide text-black/50 uppercase dark:text-white/50">
                        A stronger answer might sound like
                      </p>
                      <p className="rounded-lg border-l-2 border-(--accent) bg-(--surface) p-3">
                        {detail.coaching.sampleImprovedAnswer}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium tracking-wide text-black/50 uppercase dark:text-white/50">
                        Practice exercise
                      </p>
                      <p>{detail.coaching.practiceExercise}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-black/50 dark:text-white/50">
                    Detailed coaching is only generated per-answer in Practice mode.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
