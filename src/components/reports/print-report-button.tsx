"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-(--border) px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
    >
      Print / Save as PDF
    </button>
  );
}
