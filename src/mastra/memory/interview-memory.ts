import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

/**
 * Conversational memory only — transcript + working-memory facts for the
 * live interview turn. Supabase Postgres remains the system of record for
 * all durable business data (sessions, questions, answers, reports); this
 * store exists purely so the Interviewer agent can recall recent turns
 * without re-sending the full question/answer history in every prompt.
 *
 * Scoped per call via { resource: userId, thread: interviewSessionId } so
 * one user's sessions never leak into another's context.
 */
export const interviewMemory = new Memory({
  storage: new LibSQLStore({
    id: "interview-memory",
    url: process.env.MASTRA_MEMORY_DB_URL ?? "file:./mastra.db",
  }),
  options: {
    lastMessages: 20,
    workingMemory: {
      enabled: true,
      scope: "thread",
    },
  },
});
