const PRIORITY_STYLES: Record<"low" | "medium" | "high", string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      {priority} priority
    </span>
  );
}
