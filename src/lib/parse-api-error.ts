/** Every API route responds with { code, message } on failure
 * (see src/lib/api-response.ts), but the response body can also be
 * malformed/non-JSON if something failed before that shape was ever built
 * (a crashed dev server, a stale/rejected auth token never reaching our
 * route handler, etc). This never falls back to a single generic string —
 * callers get the real code/message when available, and the HTTP status
 * otherwise, so "unauthorized" and "not found" and "server error" are
 * distinguishable instead of collapsing into one unhelpful sentence. */
export async function parseApiError(res: Response): Promise<{ code: string; message: string }> {
  try {
    const body = await res.json();
    return {
      code: typeof body?.code === "string" ? body.code : "unknown_error",
      message: typeof body?.message === "string" ? body.message : `Request failed (HTTP ${res.status})`,
    };
  } catch {
    return { code: "unknown_error", message: `Request failed (HTTP ${res.status})` };
  }
}
