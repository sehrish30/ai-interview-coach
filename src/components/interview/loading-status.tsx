"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through a list of plausible in-progress messages and counts up
 * elapsed seconds, so a single long blocking request (an agent call that
 * can legitimately take 10-60s, longer under provider load) reads as "still
 * working" instead of a frozen spinner with no feedback.
 */
export function LoadingStatus({ messages, cycleMs = 4000 }: { messages: string[]; cycleMs?: number }) {
  const [index, setIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, cycleMs);
    const secondTimer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(messageTimer);
      clearInterval(secondTimer);
    };
  }, [messages.length, cycleMs]);

  return (
    <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent)" />
      <span>{messages[index]}</span>
      <span className="text-black/40 dark:text-white/40">· {elapsedSeconds}s</span>
    </div>
  );
}
