import { createHash } from "node:crypto";

/** Used to detect unchanged resume/JD text so we never re-run analysis on
 * identical content (spec: "never re-analyze unchanged documents"). */
export function hashContent(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

export function normalizeForCacheKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
