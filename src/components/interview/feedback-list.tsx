export function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "negative";
}) {
  const dotClassName = tone === "positive" ? "bg-green-500" : "bg-amber-500";
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-black/50 uppercase dark:text-white/50">
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
