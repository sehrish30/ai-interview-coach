-- AI Interview Coach: core schema
-- Business data lives in Postgres via Supabase; Mastra only holds transient
-- conversational memory (see mastra/memory). RLS enforces per-user isolation
-- on every table below.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- candidate_profiles: one row per authenticated user, mirrors auth.users
-- ---------------------------------------------------------------------------
create table candidate_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- interview_sessions: top-level aggregate; drives the state machine
-- ---------------------------------------------------------------------------
create type session_status as enum (
  'draft',
  'preparing',
  'ready',
  'in_progress',
  'paused',
  'completed',
  'failed'
);

create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_role text not null,
  target_company text,
  seniority text,
  interview_mode text not null default 'practice',
  difficulty text not null default 'intermediate',
  max_questions integer not null default 5,
  max_follow_ups_per_question integer not null default 1,
  research_enabled boolean not null default false,
  status session_status not null default 'draft',
  failure_reason text,
  current_question_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_sessions_user_id_idx on interview_sessions (user_id);

-- ---------------------------------------------------------------------------
-- resume_documents: raw text + cached Intake & Analysis output (resume half)
-- ---------------------------------------------------------------------------
create table resume_documents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions (id) on delete cascade,
  raw_text text not null,
  content_hash text not null,
  analysis jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

create index resume_documents_session_id_idx on resume_documents (session_id);

-- ---------------------------------------------------------------------------
-- job_descriptions: raw text + cached Intake & Analysis output (JD half)
-- ---------------------------------------------------------------------------
create table job_descriptions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions (id) on delete cascade,
  raw_text text not null,
  content_hash text not null,
  analysis jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

create index job_descriptions_session_id_idx on job_descriptions (session_id);

-- ---------------------------------------------------------------------------
-- role_matches: match score/gap output from the Intake & Analysis agent
-- ---------------------------------------------------------------------------
create table role_matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions (id) on delete cascade,
  resume_document_id uuid not null references resume_documents (id) on delete cascade,
  job_description_id uuid not null references job_descriptions (id) on delete cascade,
  match jsonb not null,
  created_at timestamptz not null default now()
);

create index role_matches_session_id_idx on role_matches (session_id);

-- ---------------------------------------------------------------------------
-- company_profiles: cached Research Agent output, keyed by normalized inputs
-- so repeated sessions for the same company/role reuse cached research
-- ---------------------------------------------------------------------------
create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  normalized_company text not null,
  normalized_role text,
  research jsonb not null,
  researched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (normalized_company, normalized_role)
);

-- ---------------------------------------------------------------------------
-- interview_plans: Interviewer agent's plan (categories, weights, focus areas)
-- ---------------------------------------------------------------------------
create table interview_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references interview_sessions (id) on delete cascade,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- interview_questions: generated + follow-up questions, in order
-- ---------------------------------------------------------------------------
create table interview_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions (id) on delete cascade,
  parent_question_id uuid references interview_questions (id) on delete cascade,
  sequence_index integer not null,
  is_follow_up boolean not null default false,
  text text not null,
  category text not null,
  difficulty text not null,
  reason_for_asking text,
  competencies_tested text[] not null default '{}',
  status text not null default 'pending', -- pending | answered | skipped
  created_at timestamptz not null default now()
);

create index interview_questions_session_id_idx on interview_questions (session_id);

-- ---------------------------------------------------------------------------
-- candidate_answers: one row per submitted answer
-- ---------------------------------------------------------------------------
create table candidate_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references interview_questions (id) on delete cascade,
  session_id uuid not null references interview_sessions (id) on delete cascade,
  answer_text text not null,
  submitted_at timestamptz not null default now()
);

create index candidate_answers_session_id_idx on candidate_answers (session_id);

-- ---------------------------------------------------------------------------
-- answer_evaluations: Evaluator agent output for each answer
-- ---------------------------------------------------------------------------
create table answer_evaluations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references candidate_answers (id) on delete cascade,
  session_id uuid not null references interview_sessions (id) on delete cascade,
  scores jsonb not null,
  evaluation jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- coaching_feedback: Coach & Report agent per-answer coaching output
-- ---------------------------------------------------------------------------
create table coaching_feedback (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references candidate_answers (id) on delete cascade,
  session_id uuid not null references interview_sessions (id) on delete cascade,
  feedback jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- final_reports: one per completed session
-- ---------------------------------------------------------------------------
create table final_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references interview_sessions (id) on delete cascade,
  overall_score numeric not null,
  readiness_level text not null,
  report jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- agent_runs: observability trace for every agent invocation
-- ---------------------------------------------------------------------------
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references interview_sessions (id) on delete cascade,
  agent_name text not null,
  status text not null, -- success | error
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms integer not null,
  model text,
  input_summary text,
  output_summary text,
  error_message text,
  created_at timestamptz not null default now()
);

create index agent_runs_session_id_idx on agent_runs (session_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger candidate_profiles_set_updated_at
  before update on candidate_profiles
  for each row execute function set_updated_at();

create trigger interview_sessions_set_updated_at
  before update on interview_sessions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table candidate_profiles enable row level security;
alter table interview_sessions enable row level security;
alter table resume_documents enable row level security;
alter table job_descriptions enable row level security;
alter table role_matches enable row level security;
alter table company_profiles enable row level security;
alter table interview_plans enable row level security;
alter table interview_questions enable row level security;
alter table candidate_answers enable row level security;
alter table answer_evaluations enable row level security;
alter table coaching_feedback enable row level security;
alter table final_reports enable row level security;
alter table agent_runs enable row level security;

create policy candidate_profiles_owner on candidate_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy interview_sessions_owner on interview_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child tables: ownership is derived from the parent interview_sessions row.
create policy resume_documents_owner on resume_documents
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = resume_documents.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = resume_documents.session_id and s.user_id = auth.uid()
    )
  );

create policy job_descriptions_owner on job_descriptions
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = job_descriptions.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = job_descriptions.session_id and s.user_id = auth.uid()
    )
  );

create policy role_matches_owner on role_matches
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = role_matches.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = role_matches.session_id and s.user_id = auth.uid()
    )
  );

create policy interview_plans_owner on interview_plans
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_plans.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_plans.session_id and s.user_id = auth.uid()
    )
  );

create policy interview_questions_owner on interview_questions
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_questions.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_questions.session_id and s.user_id = auth.uid()
    )
  );

create policy candidate_answers_owner on candidate_answers
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = candidate_answers.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = candidate_answers.session_id and s.user_id = auth.uid()
    )
  );

create policy answer_evaluations_owner on answer_evaluations
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = answer_evaluations.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = answer_evaluations.session_id and s.user_id = auth.uid()
    )
  );

create policy coaching_feedback_owner on coaching_feedback
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = coaching_feedback.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = coaching_feedback.session_id and s.user_id = auth.uid()
    )
  );

create policy final_reports_owner on final_reports
  for all using (
    exists (
      select 1 from interview_sessions s
      where s.id = final_reports.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interview_sessions s
      where s.id = final_reports.session_id and s.user_id = auth.uid()
    )
  );

create policy agent_runs_owner on agent_runs
  for select using (
    session_id is null or exists (
      select 1 from interview_sessions s
      where s.id = agent_runs.session_id and s.user_id = auth.uid()
    )
  );

-- company_profiles is shared cache (not session-owned): readable by any
-- authenticated user, writable only by the server (service role bypasses RLS).
create policy company_profiles_read on company_profiles
  for select using (auth.role() = 'authenticated');
