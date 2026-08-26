export interface SidebarQuestion {
  id: string;
  category: string;
  is_follow_up: boolean;
  sequence_index: number;
  status: string;
}

interface QuestionProgressSidebarProps {
  questions: SidebarQuestion[];
  maxQuestions: number;
  activeQuestionId: string | null;
  /** Called with a question's id and its 1-based display number when a
   * completed (answered) slot is clicked. Active/locked slots are never
   * clickable. */
  onSelectAnswered?: (questionId: string, questionNumber: number) => void;
}

/**
 * A stepper showing every question slot (0..maxQuestions-1). Questions are
 * generated one at a time by the Interviewer Agent based on the prior
 * answer, so only slots that already exist in `questions` have a real
 * title — everything after the active slot is a locked placeholder, not a
 * hidden-but-known question. Completed slots are clickable to review what
 * was asked/answered; they're never editable from here.
 */
export function QuestionProgressSidebar({
  questions,
  maxQuestions,
  activeQuestionId,
  onSelectAnswered,
}: QuestionProgressSidebarProps) {
  const bySequenceIndex = new Map(questions.map((q) => [q.sequence_index, q]));

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-(--border) px-4 py-8">
      <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        Interview progress
      </p>
      <ol className="flex flex-col gap-1">
        {Array.from({ length: maxQuestions }, (_, i) => {
          const q = bySequenceIndex.get(i);
          const isActive = !!q && q.id === activeQuestionId;
          const isDone = !!q && q.status === "answered" && !isActive;
          const isLocked = !q;

          const badge = (
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                isDone
                  ? "bg-(--accent) text-white"
                  : isActive
                    ? "border-2 border-(--accent) text-(--accent)"
                    : "border border-(--border) text-black/30 dark:text-white/30"
              }`}
            >
              {isDone ? "✓" : i + 1}
            </span>
          );

          const label = (
            <div className="flex flex-col">
              <span
                className={`text-sm font-medium ${isLocked ? "text-black/30 dark:text-white/30" : ""}`}
              >
                Question {i + 1}
                {q?.is_follow_up ? " · follow-up" : ""}
              </span>
              <span
                className={`text-xs ${
                  isLocked ? "text-black/20 dark:text-white/20" : "text-black/50 dark:text-white/50"
                }`}
              >
                {isLocked ? "Locked" : q.category}
              </span>
            </div>
          );

          if (isDone && onSelectAnswered) {
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onSelectAnswered(q.id, i + 1)}
                  className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {badge}
                  {label}
                </button>
              </li>
            );
          }

          return (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-md px-2 py-2 ${
                isActive ? "bg-(--accent)/10" : ""
              }`}
            >
              {badge}
              {label}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
