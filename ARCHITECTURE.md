# Architecture

## System architecture

```mermaid
flowchart TB
    subgraph Browser
        UI[Next.js App Router UI]
    end

    subgraph Server["Next.js server (route handlers + server components)"]
        API[API routes /api/sessions/*]
        MW[middleware.ts\nSupabase session refresh]
    end

    subgraph Mastra["Mastra runtime (src/mastra)"]
        WF[Workflows\npreparation / turn / finalization]
        AG[5 Agents\nIntake&Analysis, Research,\nInterviewer, Evaluator, Coach&Report]
        MEM[(LibSQL\nconversation memory)]
    end

    subgraph Supabase
        AUTH[Supabase Auth]
        PG[(Postgres\nsessions, questions, answers,\nevaluations, reports, RLS)]
    end

    LLM[[Model provider\nvia AI_MODEL env var]]

    UI -->|fetch| API
    UI --> AUTH
    MW --> AUTH
    API --> WF
    WF --> AG
    AG --> MEM
    AG --> LLM
    WF -->|repositories| PG
    API -->|repositories, RLS-scoped| PG
```

## Preparation workflow

```mermaid
sequenceDiagram
    participant U as Candidate
    participant API as POST /api/sessions/:id/prepare
    participant WF as preparation-workflow
    participant IA as Intake & Analysis Agent
    participant R as Research Agent
    participant IV as Interviewer Agent
    participant DB as Postgres

    U->>API: resumeText, jobDescriptionText
    API->>DB: transition session draft -> preparing
    API->>WF: start({sessionId, resumeText, jobDescriptionText})
    WF->>DB: upsert resume/job docs (cache by content hash)
    alt cache miss
        WF->>IA: analyze resume + JD
        IA-->>WF: resume analysis, JD analysis, role match
        WF->>DB: save analyses + role match
    end
    alt research_enabled and target company set
        WF->>DB: check company_profiles cache
        alt cache miss
            WF->>R: research company + role
            R-->>WF: research output (or empty, no fabrication)
            WF->>DB: save to company_profiles
        end
    end
    WF->>IV: build interview plan
    IV-->>WF: InterviewPlan (categories, weights)
    WF->>DB: save interview_plans
    WF->>IV: generate first question
    IV-->>WF: first question
    WF->>DB: save interview_questions[0]
    WF->>DB: transition session preparing -> ready
    WF-->>API: {sessionId, status: ready}
    API-->>U: 200 OK
```

## Interview-turn workflow

```mermaid
sequenceDiagram
    participant U as Candidate
    participant API as POST /api/sessions/:id/answers
    participant WF as interview-turn-workflow
    participant EV as Evaluator Agent
    participant CR as Coach & Report Agent
    participant IV as Interviewer Agent
    participant DB as Postgres

    U->>API: {questionId, answerText}
    API->>WF: start({sessionId, questionId, answerText})
    WF->>DB: insert candidate_answers, mark question answered
    WF->>EV: evaluate answer
    EV-->>WF: scores, strengths/weaknesses, technical/communication review
    WF->>DB: save answer_evaluations
    Note over WF: answerScore computed deterministically\n(src/server/services/scoring.ts), not by an agent
    alt interview_mode == practice
        WF->>CR: coach this answer
        CR-->>WF: CoachingOutput
        WF->>DB: save coaching_feedback
    end
    WF->>DB: increment current_question_index
    alt max questions reached
        WF->>DB: transition session -> completed
    else
        WF->>IV: decide follow-up or next question
        IV-->>WF: InterviewTurnDecision
        WF->>DB: insert next interview_questions row
    end
    WF-->>API: {answerScore, coaching, interviewComplete, nextQuestionId}
    API-->>U: 200 OK
```

## Agent call graph

There is no LLM orchestrator/router. Each workflow calls a fixed sequence of
agents directly — see [AGENTS.md](./AGENTS.md#delegation-model) for why an
agent network was deliberately not used here.

```mermaid
flowchart LR
    PW[preparation-workflow] --> IA[Intake & Analysis Agent]
    PW --> RA[Research Agent]
    PW --> IV1[Interviewer Agent\nplanning call]

    TW[interview-turn-workflow] --> EV[Evaluator Agent]
    TW --> CR1[Coach & Report Agent\nper-answer call]
    TW --> IV2[Interviewer Agent\nturn-decision call]

    FW[finalization-workflow] --> CR2[Coach & Report Agent\nfinal narrative call]

    IA -.->|feeds| IV1
    RA -.->|feeds| IV1
```

## Database relationships

```mermaid
erDiagram
    candidate_profiles ||--o{ interview_sessions : owns
    interview_sessions ||--o{ resume_documents : has
    interview_sessions ||--o{ job_descriptions : has
    interview_sessions ||--o{ role_matches : has
    interview_sessions ||--o| interview_plans : has
    interview_sessions ||--o{ interview_questions : has
    interview_sessions ||--o{ candidate_answers : has
    interview_sessions ||--o{ answer_evaluations : has
    interview_sessions ||--o{ coaching_feedback : has
    interview_sessions ||--o| final_reports : has
    interview_sessions ||--o{ agent_runs : has
    resume_documents ||--o{ role_matches : "matched against"
    job_descriptions ||--o{ role_matches : "matched against"
    interview_questions ||--o{ candidate_answers : answered_by
    interview_questions ||--o{ interview_questions : "follow-up of"
    candidate_answers ||--|| answer_evaluations : evaluated_by
    candidate_answers ||--|| coaching_feedback : coached_by
    company_profiles {
        text normalized_company
        text normalized_role
        jsonb research
    }
```

`company_profiles` is intentionally not connected to `interview_sessions` —
it's a shared cache keyed by normalized company/role, not owned by any one
session, so multiple candidates researching the same company reuse it.
