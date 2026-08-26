import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function savePlan(client: Client, sessionId: string, plan: Json) {
  const { data, error } = await client
    .from("interview_plans")
    .insert({ session_id: sessionId, plan })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPlan(client: Client, sessionId: string) {
  const { data, error } = await client
    .from("interview_plans")
    .select("*")
    .eq("session_id", sessionId)
    .single();
  if (error) throw error;
  return data;
}

export interface InsertQuestionInput {
  sessionId: string;
  parentQuestionId?: string | null;
  sequenceIndex: number;
  isFollowUp?: boolean;
  text: string;
  category: string;
  difficulty: string;
  reasonForAsking?: string | null;
  competenciesTested?: string[];
}

export async function insertQuestion(client: Client, input: InsertQuestionInput) {
  const { data, error } = await client
    .from("interview_questions")
    .insert({
      session_id: input.sessionId,
      parent_question_id: input.parentQuestionId ?? null,
      sequence_index: input.sequenceIndex,
      is_follow_up: input.isFollowUp ?? false,
      text: input.text,
      category: input.category,
      difficulty: input.difficulty,
      reason_for_asking: input.reasonForAsking ?? null,
      competencies_tested: input.competenciesTested ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markQuestionAnswered(client: Client, questionId: string) {
  const { error } = await client
    .from("interview_questions")
    .update({ status: "answered" })
    .eq("id", questionId);
  if (error) throw error;
}

export async function getQuestion(client: Client, questionId: string) {
  const { data, error } = await client
    .from("interview_questions")
    .select("*")
    .eq("id", questionId)
    .single();
  if (error) throw error;
  return data;
}

export async function listQuestionsForSession(client: Client, sessionId: string) {
  const { data, error } = await client
    .from("interview_questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_index", { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertAnswer(
  client: Client,
  input: { sessionId: string; questionId: string; answerText: string },
) {
  const { data, error } = await client
    .from("candidate_answers")
    .insert({
      session_id: input.sessionId,
      question_id: input.questionId,
      answer_text: input.answerText,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveEvaluation(
  client: Client,
  input: { sessionId: string; answerId: string; scores: Json; evaluation: Json },
) {
  const { data, error } = await client
    .from("answer_evaluations")
    .insert({
      session_id: input.sessionId,
      answer_id: input.answerId,
      scores: input.scores,
      evaluation: input.evaluation,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveCoaching(
  client: Client,
  input: { sessionId: string; answerId: string; feedback: Json },
) {
  const { data, error } = await client
    .from("coaching_feedback")
    .insert({
      session_id: input.sessionId,
      answer_id: input.answerId,
      feedback: input.feedback,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface AnswerDetail {
  question: Database["public"]["Tables"]["interview_questions"]["Row"];
  answer: Database["public"]["Tables"]["candidate_answers"]["Row"];
  evaluation: Database["public"]["Tables"]["answer_evaluations"]["Row"] | null;
  coaching: Database["public"]["Tables"]["coaching_feedback"]["Row"] | null;
}

/** Fetches everything to render a read-only "review this past answer" view:
 * the question asked, what was answered, its evaluation, and (if this
 * session is in Practice mode) its per-answer coaching. Returns null if the
 * question hasn't been answered yet. */
export async function getAnswerDetailForQuestion(
  client: Client,
  questionId: string,
): Promise<AnswerDetail | null> {
  const { data: answer, error: answerError } = await client
    .from("candidate_answers")
    .select("*")
    .eq("question_id", questionId)
    .maybeSingle();
  if (answerError) throw answerError;
  if (!answer) return null;

  const [{ data: question, error: questionError }, { data: evaluation, error: evaluationError },
    { data: coaching, error: coachingError }] = await Promise.all([
    client.from("interview_questions").select("*").eq("id", questionId).single(),
    client.from("answer_evaluations").select("*").eq("answer_id", answer.id).maybeSingle(),
    client.from("coaching_feedback").select("*").eq("answer_id", answer.id).maybeSingle(),
  ]);
  if (questionError) throw questionError;
  if (evaluationError) throw evaluationError;
  if (coachingError) throw coachingError;

  return { question, answer, evaluation, coaching };
}

export interface AnswerWithEvaluation {
  answer: Database["public"]["Tables"]["candidate_answers"]["Row"];
  question: Database["public"]["Tables"]["interview_questions"]["Row"];
  evaluation: Database["public"]["Tables"]["answer_evaluations"]["Row"] | null;
  coaching: Database["public"]["Tables"]["coaching_feedback"]["Row"] | null;
}

export async function listAnswersWithEvaluations(
  client: Client,
  sessionId: string,
): Promise<AnswerWithEvaluation[]> {
  const [{ data: answers, error: answersError }, { data: questions, error: questionsError },
    { data: evaluations, error: evaluationsError }, { data: coaching, error: coachingError }] =
    await Promise.all([
      client.from("candidate_answers").select("*").eq("session_id", sessionId),
      client.from("interview_questions").select("*").eq("session_id", sessionId),
      client.from("answer_evaluations").select("*").eq("session_id", sessionId),
      client.from("coaching_feedback").select("*").eq("session_id", sessionId),
    ]);
  if (answersError) throw answersError;
  if (questionsError) throw questionsError;
  if (evaluationsError) throw evaluationsError;
  if (coachingError) throw coachingError;

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const evaluationByAnswerId = new Map(evaluations.map((e) => [e.answer_id, e]));
  const coachingByAnswerId = new Map(coaching.map((c) => [c.answer_id, c]));

  return answers.map((answer) => {
    const question = questionById.get(answer.question_id);
    if (!question) {
      throw new Error(`Answer ${answer.id} references missing question ${answer.question_id}`);
    }
    return {
      answer,
      question,
      evaluation: evaluationByAnswerId.get(answer.id) ?? null,
      coaching: coachingByAnswerId.get(answer.id) ?? null,
    };
  });
}
