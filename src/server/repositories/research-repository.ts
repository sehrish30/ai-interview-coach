import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { normalizeForCacheKey } from "@/server/services/content-hash";

type Client = SupabaseClient<Database>;

/** Cached by normalized company + role so repeated sessions targeting the
 * same company reuse research instead of re-fetching every time. */
export async function getCachedResearch(client: Client, company: string, role: string | null) {
  const normalizedCompany = normalizeForCacheKey(company);
  const normalizedRole = role ? normalizeForCacheKey(role) : null;

  let query = client
    .from("company_profiles")
    .select("*")
    .eq("normalized_company", normalizedCompany);
  query = normalizedRole ? query.eq("normalized_role", normalizedRole) : query.is("normalized_role", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

/** Writes go through the service-role client (company_profiles is a shared
 * cache, not owned by any single session) — callers must use
 * createSupabaseServiceRoleClient() here, never the user-scoped client. */
export async function saveResearch(
  client: Client,
  input: { company: string; role: string | null; research: Json },
) {
  const { data, error } = await client
    .from("company_profiles")
    .upsert(
      {
        normalized_company: normalizeForCacheKey(input.company),
        normalized_role: input.role ? normalizeForCacheKey(input.role) : null,
        research: input.research,
        researched_at: new Date().toISOString(),
      },
      { onConflict: "normalized_company,normalized_role" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
