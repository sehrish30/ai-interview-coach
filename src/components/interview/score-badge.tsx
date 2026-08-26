const SCORE_STYLES = [
  { min: 80, className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { min: 60, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { min: 0, className: "bg-red-500/10 text-red-600 dark:text-red-400" },
];

export function ScoreBadge({ score }: { score: number }) {
  const style = SCORE_STYLES.find((s) => score >= s.min)!;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
      {Math.round(score)}/100
    </span>
  );
}
