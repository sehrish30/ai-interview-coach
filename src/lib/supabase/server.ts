import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getServerEnv, getPublicEnv } from "@/lib/env";

/**
 * Request-scoped client that respects RLS as the signed-in user.
 * Use this for anything triggered by a real user request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render; middleware refreshes the
          // session cookie instead, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Privileged client (Supabase "secret key" — the modern replacement for the
 * legacy service_role key) that bypasses RLS. Server-only, never import from
 * client code. Reserved for trusted background work (workflows, agent
 * runs, cache writes to shared tables like company_profiles) where the
 * acting user has already been authorized upstream.
 */
export function createSupabaseServiceRoleClient() {
  const env = getServerEnv();
  return createRawClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
