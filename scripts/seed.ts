/**
 * Demo data: one fictional candidate with a completed interview session,
 * so the dashboard/report UI has something to show without running the
 * full agent pipeline. Run with: npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SECRET_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set to seed data");
}

const supabase = createClient<Database>(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo.candidate@example.com";
const DEMO_PASSWORD = "demo-password-123!";

async function getOrCreateDemoUser() {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === DEMO_EMAIL);
  if (found) return found;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Jordan Rivera" },
  });
  if (error) throw error;
  return data.user;
}

async function main() {
  const user = await getOrCreateDemoUser();
  console.log(`Demo user ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (id=${user.id})`);

  const { data: session, error: sessionError } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      target_role: "Senior Backend Engineer",
      target_company: "Nimbus Cloud",
      seniority: "senior",
      interview_mode: "practice",
      difficulty: "intermediate",
      max_questions: 3,
      status: "completed",
      current_question_index: 3,
    })
    .select()
    .single();
  if (sessionError) throw sessionError;

  const resumeText =
    "Jordan Rivera — 6 years building backend systems in Python and Go. Led migration of a " +
    "monolith to microservices at Beacon Retail, cutting p99 latency by 40%. Mentored 3 junior engineers.";
  const jdText =
    "Senior Backend Engineer at Nimbus Cloud. Own distributed systems for our billing platform. " +
    "Requires 5+ years backend experience, Go or Python, and experience mentoring engineers.";

  const { data: resumeDoc, error: resumeError } = await supabase
    .from("resume_documents")
    .insert({
      session_id: session.id,
      raw_text: resumeText,
      content_hash: "seed-resume-hash",
      analysis: {
        candidateSummary: "Backend engineer with strong distributed-systems and mentoring experience.",
        yearsOfExperience: 6,
        industries: ["retail", "cloud infrastructure"],
        technicalSkills: ["Python", "Go", "microservices", "distributed systems"],
        softSkills: ["mentoring", "leadership"],
        tools: ["Kubernetes", "PostgreSQL"],
        achievements: [
          {
            statement: "Cut p99 latency by 40% during microservices migration",
            measurableImpact: "40% latency reduction",
            evidenceStrength: "strong",
          },
        ],
        leadershipExamples: ["Mentored 3 junior engineers"],
        potentialConcerns: [],
        interviewTopics: ["microservices migration", "mentoring"],
        suggestedStarStories: ["Monolith-to-microservices migration at Beacon Retail"],
      },
      analyzed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (resumeError) throw resumeError;

  const { data: jdDoc, error: jdError } = await supabase
    .from("job_descriptions")
    .insert({
      session_id: session.id,
      raw_text: jdText,
      content_hash: "seed-jd-hash",
      analysis: {
        jobTitle: "Senior Backend Engineer",
        seniority: "senior",
        mandatoryRequirements: ["5+ years backend experience", "Go or Python"],
        preferredRequirements: ["Mentoring experience"],
        technicalCompetencies: ["distributed systems", "billing platforms"],
        behavioralCompetencies: ["mentoring", "ownership"],
        leadershipExpectations: ["Mentor junior engineers"],
        responsibilities: ["Own distributed billing systems"],
        industryKnowledge: ["cloud infrastructure"],
        keywords: ["Go", "Python", "distributed systems"],
        likelyInterviewThemes: ["scaling systems", "mentoring"],
      },
      analyzed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (jdError) throw jdError;

  await supabase.from("role_matches").insert({
    session_id: session.id,
    resume_document_id: resumeDoc.id,
    job_description_id: jdDoc.id,
    match: {
      overallMatchScore: 82,
      categoryScores: {
        experience: 85,
        technicalSkills: 80,
        behavioralSkills: 78,
        leadership: 88,
        industryKnowledge: 70,
      },
      strongMatches: ["Distributed systems experience", "Mentoring track record"],
      partialMatches: ["Billing-domain exposure"],
      skillGaps: ["Direct billing/payments experience"],
      evidenceGaps: [],
      transferableStrengths: ["Microservices migration experience transfers to billing platform work"],
      preparationPriorities: ["Prepare examples connecting past scaling work to billing systems"],
    },
  });

  await supabase.from("company_profiles").upsert(
    {
      normalized_company: "nimbus cloud",
      normalized_role: "senior backend engineer",
      research: {
        companyOverview: "Nimbus Cloud provides billing infrastructure for SaaS companies.",
        productsAndServices: ["Billing API", "Usage metering"],
        officialValuesAndCulture: ["Customer obsession", "Ownership"],
        strategicPriorities: ["Scaling billing throughput"],
        recentDevelopments: [],
        industryChallenges: ["Billing accuracy at scale"],
        competitors: ["Stripe", "Chargebee"],
        roleRelevantInsights: ["Team recently rebuilt metering pipeline"],
        interviewProcess: {
          officialProcessFound: false,
          summary: null,
          stages: [],
          uncertaintyNotes: ["No official process published"],
        },
        reportedInterviewThemes: [],
        likelyPreparationTopics: [],
        suggestedCandidateQuestions: ["How does the team handle billing accuracy at scale?"],
        warnings: ["Demo data — not real research"],
        sources: [],
      },
    },
    { onConflict: "normalized_company,normalized_role" },
  );

  const { error: planError } = await supabase
    .from("interview_plans")
    .insert({
      session_id: session.id,
      plan: {
        interviewTitle: "Senior Backend Engineer @ Nimbus Cloud",
        difficulty: "intermediate",
        estimatedMinutes: 20,
        totalQuestions: 3,
        categories: [
          { name: "Technical", weight: 50, objectives: ["Distributed systems depth"], targetQuestionCount: 1 },
          { name: "Behavioral", weight: 30, objectives: ["Ownership, mentoring"], targetQuestionCount: 1 },
          { name: "Leadership", weight: 20, objectives: ["Mentoring examples"], targetQuestionCount: 1 },
        ],
        focusAreas: ["Distributed systems", "Mentoring"],
        riskAreas: ["Billing-domain depth"],
        coachingPriorities: ["Quantify impact with metrics"],
      },
    })
    .select()
    .single();
  if (planError) throw planError;

  const questionsData = [
    {
      category: "Technical",
      difficulty: "hard",
      text: "Walk me through how you'd design a billing system that must never double-charge a customer.",
      answer:
        "I'd use idempotency keys on every charge request, store them with a unique constraint, and " +
        "reconcile via an append-only ledger so retries are safe.",
      scores: {
        relevance: 90,
        completeness: 80,
        specificity: 85,
        evidence: 75,
        structure: 82,
        communication: 88,
        roleAlignment: 90,
        technicalAccuracy: 88,
        starQuality: null,
      },
    },
    {
      category: "Behavioral",
      difficulty: "medium",
      text: "Tell me about a time you owned a project end to end under ambiguity.",
      answer:
        "At Beacon Retail I led the monolith-to-microservices migration end to end: I scoped the plan, " +
        "got buy-in from three teams, and delivered a 40% p99 latency reduction over two quarters.",
      scores: {
        relevance: 88,
        completeness: 82,
        specificity: 90,
        evidence: 92,
        structure: 85,
        communication: 84,
        roleAlignment: 86,
        technicalAccuracy: null,
        starQuality: 88,
      },
    },
    {
      category: "Leadership",
      difficulty: "medium",
      text: "How have you helped junior engineers grow?",
      answer:
        "I mentored three junior engineers through structured 1:1s and pairing on the migration, and " +
        "two of them later led their own smaller migrations independently.",
      scores: {
        relevance: 85,
        completeness: 78,
        specificity: 80,
        evidence: 84,
        structure: 80,
        communication: 82,
        roleAlignment: 80,
        technicalAccuracy: null,
        starQuality: 80,
      },
    },
  ];

  const answerSummaries: {
    questionText: string;
    category: string;
    answerScore: number;
    strengths: string[];
    weaknesses: string[];
  }[] = [];
  let index = 0;
  for (const q of questionsData) {
    const { data: question, error: questionError } = await supabase
      .from("interview_questions")
      .insert({
        session_id: session.id,
        sequence_index: index,
        text: q.text,
        category: q.category,
        difficulty: q.difficulty,
        status: "answered",
        reason_for_asking: `Probe ${q.category.toLowerCase()} competency for this role`,
        competencies_tested: [q.category],
      })
      .select()
      .single();
    if (questionError) throw questionError;

    const { data: answer, error: answerError } = await supabase
      .from("candidate_answers")
      .insert({ session_id: session.id, question_id: question.id, answer_text: q.answer })
      .select()
      .single();
    if (answerError) throw answerError;

    const evaluation = {
      answerSummary: q.answer.slice(0, 80),
      scores: q.scores,
      strengths: ["Specific, concrete example", "Clear structure"],
      weaknesses: ["Could quantify impact further"],
      unsupportedClaims: [],
      missingEvidence: [],
      technicalReview:
        q.category === "Technical"
          ? {
              isApplicable: true,
              correctElements: ["Idempotency keys", "Append-only ledger"],
              incorrectOrUnclearElements: [],
              correctedExplanation: null,
            }
          : null,
      communicationReview: {
        clarityScore: 85,
        concisenessScore: 80,
        logicalFlowScore: 85,
        observations: ["Clear structure"],
        phrasesToImprove: [],
      },
      followUpRecommended: false,
      followUpReason: null,
      confidence: 85,
    };

    await supabase.from("answer_evaluations").insert({
      session_id: session.id,
      answer_id: answer.id,
      scores: q.scores,
      evaluation,
    });

    await supabase.from("coaching_feedback").insert({
      session_id: session.id,
      answer_id: answer.id,
      feedback: {
        positiveFeedback: ["Concrete example with a clear outcome"],
        improvementAreas: ["Add a specific metric or timeframe"],
        starAssessment:
          q.category !== "Technical"
            ? {
                situation: "Context of the project",
                task: "What needed to be done",
                action: "What the candidate did",
                result: "Outcome achieved",
              }
            : null,
        improvedAnswerOutline: ["State the situation", "Describe the action", "Quantify the result"],
        sampleImprovedAnswer: q.answer,
        practiceExercise: "Rehearse this story with a specific number attached to the outcome.",
        priority: "medium",
      },
    });

    answerSummaries.push({
      questionText: q.text,
      category: q.category,
      answerScore: Math.round(
        (q.scores.relevance + q.scores.completeness + q.scores.specificity + q.scores.evidence) / 4,
      ),
      strengths: ["Specific example"],
      weaknesses: ["Could quantify further"],
    });

    index += 1;
  }

  await supabase.from("final_reports").insert({
    session_id: session.id,
    overall_score: 84,
    readiness_level: "interview-ready",
    report: {
      overallScore: 84,
      categoryScores: [
        { category: "Technical", score: 86, weight: 50, answerCount: 1 },
        { category: "Behavioral", score: 85, weight: 30, answerCount: 1 },
        { category: "Leadership", score: 80, weight: 20, answerCount: 1 },
      ],
      answerSummaries,
      narrative: {
        strongestCompetencies: ["Distributed systems design", "Ownership under ambiguity"],
        developmentAreas: ["Quantifying impact with more metrics"],
        readinessLevel: "interview-ready",
        recommendation: "yes",
        recommendationExplanation:
          "This is simulated coaching feedback, not a real hiring decision. Jordan shows strong " +
          "technical depth and ownership; a bit more quantified impact would strengthen answers further.",
        categoryExplanations: [
          { category: "Technical", explanation: "Strong grasp of idempotency and ledger-based design." },
        ],
        sevenDayPlan: [
          { day: 1, focus: "Metrics", actions: ["Add specific numbers to each STAR story"] },
          { day: 2, focus: "Billing domain", actions: ["Read up on payment idempotency patterns"] },
        ],
        suggestedCandidateQuestions: ["How does the team measure billing accuracy today?"],
        limitations: ["No voice/video signal available", "Small sample of 3 questions"],
        confidence: 80,
      },
      disclaimer:
        "This application provides simulated interview practice and coaching. Its scores and " +
        "recommendations should not be treated as real hiring decisions.",
    },
  });

  console.log(`Seeded completed interview session ${session.id} for ${DEMO_EMAIL}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
