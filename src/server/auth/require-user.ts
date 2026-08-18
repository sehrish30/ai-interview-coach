import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

/** Every API entry point must call this before touching session data — RLS
 * is the second line of defense, not the only one. */
export async function requireUser(client: SupabaseClient<Database>) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new UnauthorizedError();
  return user;
}
