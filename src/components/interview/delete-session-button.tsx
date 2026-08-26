"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteSessionButton({ sessionId, label }: { sessionId: string; label: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;

    setDeleting(true);
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      window.alert("Could not delete this session. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-600 underline underline-offset-2 disabled:opacity-50 dark:text-red-400"
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
