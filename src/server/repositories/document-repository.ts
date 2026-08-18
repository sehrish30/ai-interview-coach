import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { hashContent } from "@/server/services/content-hash";

type Client = SupabaseClient<Database>;

/** Upserts by content hash so pasting the same resume text twice reuses the
 * cached row instead of re-analyzing (spec: cache resume analysis). */
export async function upsertResumeDocument(client: Client, sessionId: string, rawText: string) {
  const contentHash = hashContent(rawText);
  const { data: existing } = await client
    .from("resume_documents")
    .select("*")
    .eq("session_id", sessionId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await client
    .from("resume_documents")
    .insert({ session_id: sessionId, raw_text: rawText, content_hash: contentHash })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertJobDescription(client: Client, sessionId: string, rawText: string) {
  const contentHash = hashContent(rawText);
  const { data: existing } = await client
    .from("job_descriptions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await client
    .from("job_descriptions")
    .insert({ session_id: sessionId, raw_text: rawText, content_hash: contentHash })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveResumeAnalysis(client: Client, resumeDocumentId: string, analysis: Json) {
  const { error } = await client
    .from("resume_documents")
    .update({ analysis, analyzed_at: new Date().toISOString() })
    .eq("id", resumeDocumentId);
  if (error) throw error;
}

export async function saveJobDescriptionAnalysis(
  client: Client,
  jobDescriptionId: string,
  analysis: Json,
) {
  const { error } = await client
    .from("job_descriptions")
    .update({ analysis, analyzed_at: new Date().toISOString() })
    .eq("id", jobDescriptionId);
  if (error) throw error;
}

export async function saveRoleMatch(
  client: Client,
  input: { sessionId: string; resumeDocumentId: string; jobDescriptionId: string; match: Json },
) {
  const { data, error } = await client
    .from("role_matches")
    .insert({
      session_id: input.sessionId,
      resume_document_id: input.resumeDocumentId,
      job_description_id: input.jobDescriptionId,
      match: input.match,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSessionDocuments(client: Client, sessionId: string) {
  const [{ data: resume, error: resumeError }, { data: jobDescription, error: jdError }] =
    await Promise.all([
      client
        .from("resume_documents")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("job_descriptions")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (resumeError) throw resumeError;
  if (jdError) throw jdError;
  return { resume, jobDescription };
}
