"use client";

import { useCallback, useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { QuestionProgressSidebar } from "@/components/interview/question-progress-sidebar";
import { AnswerDetailModal } from "@/components/interview/answer-detail-modal";

interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  sequence_index: number;
  is_follow_up: boolean;
  status: string;
}

interface Progress {
  currentQuestionIndex: number;
  maxQuestions: number;
}

interface TurnResult {
  answerScore: number;
  interviewComplete: boolean;
  coaching: {
    positiveFeedback: string[];
    improvementAreas: string[];
    sampleImprovedAnswer: string;
    practiceExercise: string;
  } | null;
  nextQuestion: Question | null;
}

type Status = "loading" | "answering" | "submitting" | "feedback" | "complete" | "error";

export default function InterviewRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [question, setQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [lastResult, setLastResult] = useState<TurnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ id: string; number: number } | null>(null);

  const loadCurrentQuestion = useCallback(async () => {
    setStatus("loading");
    const res = await fetch(`/api/sessions/${id}/questions/current`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Could not load the current question");
      setStatus("error");
      return;
    }
    const body = await res.json();
    setQuestion(body.question);
    setQuestions(body.questions);
    setProgress(body.progress);
    setAnswerText("");
    setStatus("answering");
  }, [id]);

  useEffect(() => {
    // Fetching the current question on mount is the external synchronization
    // this effect exists for; the setState calls inside loadCurrentQuestion
    // are the fetch result landing in state, not a synchronous render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCurrentQuestion();
  }, [loadCurrentQuestion]);

  async function submitAnswer() {
    if (!question) return;
    setStatus("submitting");
    const res = await fetch(`/api/sessions/${id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, answerText }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Could not submit that answer");
      setStatus("error");
      return;
    }
    const result: TurnResult = await res.json();
    setLastResult(result);
    setQuestions((prev) => {
      const updated = prev.map((q) => (q.id === question.id ? { ...q, status: "answered" } : q));
      if (result.nextQuestion && !updated.some((q) => q.id === result.nextQuestion!.id)) {
        return [...updated, result.nextQuestion];
      }
      return updated;
    });

    if (result.interviewComplete) {
      setStatus("complete");
      return;
    }

    if (result.coaching) {
      setStatus("feedback");
    } else if (result.nextQuestion) {
      setQuestion(result.nextQuestion);
      setAnswerText("");
      setProgress((p) => (p ? { ...p, currentQuestionIndex: p.currentQuestionIndex + 1 } : p));
      setStatus("answering");
    }
  }

  function continueAfterFeedback() {
    if (lastResult?.nextQuestion) {
      setQuestion(lastResult.nextQuestion);
      setProgress((p) => (p ? { ...p, currentQuestionIndex: p.currentQuestionIndex + 1 } : p));
      setAnswerText("");
      setStatus("answering");
    }
  }

  if (status === "loading") {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (status === "error") {
    return (
      <CenteredMessage>
        <p className="text-red-500">{error}</p>
      </CenteredMessage>
    );
  }

  if (status === "complete") {
    return (
      <WithSidebar
        questions={questions}
        progress={progress}
        activeQuestionId={null}
        onSelectAnswered={(id, number) => setReviewing({ id, number })}
        reviewing={reviewing}
        onCloseReview={() => setReviewing(null)}
        sessionId={id}
      >
        <CenteredMessage>
          <p className="mb-4 font-medium">Interview complete.</p>
          <button
            onClick={() => router.push(`/interviews/${id}/report`)}
            className="rounded-md bg-(--accent) px-5 py-2.5 font-medium text-white"
          >
            View final report
          </button>
        </CenteredMessage>
      </WithSidebar>
    );
  }

  if (status === "feedback" && lastResult?.coaching) {
    const c = lastResult.coaching;
    return (
      <WithSidebar
        questions={questions}
        progress={progress}
        activeQuestionId={question?.id ?? null}
        onSelectAnswered={(id, number) => setReviewing({ id, number })}
        reviewing={reviewing}
        onCloseReview={() => setReviewing(null)}
        sessionId={id}
      >
        <main className="mx-auto max-w-2xl px-6 py-12">
          <h2 className="mb-1 text-lg font-semibold">Answer score: {lastResult.answerScore}/100</h2>
          <div className="mt-4 flex flex-col gap-4 text-sm">
            {c.positiveFeedback.length > 0 && (
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">What worked</p>
                <ul className="list-inside list-disc">
                  {c.positiveFeedback.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {c.improvementAreas.length > 0 && (
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">Areas to improve</p>
                <ul className="list-inside list-disc">
                  {c.improvementAreas.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="font-medium">A stronger answer might sound like</p>
              <p className="mt-1 rounded-md border border-(--border) p-3">
                {c.sampleImprovedAnswer}
              </p>
            </div>
            <div>
              <p className="font-medium">Practice exercise</p>
              <p>{c.practiceExercise}</p>
            </div>
          </div>
          <button
            onClick={continueAfterFeedback}
            className="mt-6 rounded-md bg-(--accent) px-5 py-2.5 font-medium text-white"
          >
            Continue
          </button>
        </main>
      </WithSidebar>
    );
  }

  return (
    <WithSidebar
      questions={questions}
      progress={progress}
      activeQuestionId={question?.id ?? null}
      onSelectAnswered={(id, number) => setReviewing({ id, number })}
      reviewing={reviewing}
      onCloseReview={() => setReviewing(null)}
      sessionId={id}
    >
      <main className="mx-auto max-w-2xl px-6 py-12">
        {progress && (
          <p className="mb-2 text-sm text-black/60 dark:text-white/60">
            Question {progress.currentQuestionIndex + 1} of {progress.maxQuestions}
            {question?.is_follow_up ? " · follow-up" : ""}
          </p>
        )}
        <p className="mb-1 text-xs uppercase tracking-wide text-(--accent)">{question?.category}</p>
        <h2 className="mb-6 text-xl font-medium">{question?.text}</h2>
        <textarea
          rows={8}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Type your answer…"
          className="w-full rounded-md border border-(--border) bg-transparent px-3 py-2"
        />
        <button
          onClick={submitAnswer}
          disabled={status === "submitting" || answerText.trim().length === 0}
          className="mt-4 rounded-md bg-(--accent) px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {status === "submitting" ? "Evaluating…" : "Submit answer"}
        </button>
      </main>
    </WithSidebar>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      {children}
    </main>
  );
}

function WithSidebar({
  questions,
  progress,
  activeQuestionId,
  onSelectAnswered,
  reviewing,
  onCloseReview,
  sessionId,
  children,
}: {
  questions: Question[];
  progress: Progress | null;
  activeQuestionId: string | null;
  onSelectAnswered: (questionId: string, questionNumber: number) => void;
  reviewing: { id: string; number: number } | null;
  onCloseReview: () => void;
  sessionId: string;
  children: React.ReactNode;
}) {
  if (!progress) return <>{children}</>;
  return (
    <div className="flex min-h-screen">
      <QuestionProgressSidebar
        questions={questions}
        maxQuestions={progress.maxQuestions}
        activeQuestionId={activeQuestionId}
        onSelectAnswered={onSelectAnswered}
      />
      <div className="flex-1">{children}</div>
      {reviewing && (
        <AnswerDetailModal
          sessionId={sessionId}
          questionId={reviewing.id}
          questionNumber={reviewing.number}
          onClose={onCloseReview}
        />
      )}
    </div>
  );
}
