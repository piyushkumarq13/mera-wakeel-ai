-- =====================================================
-- MIGRATION 010: Case Summary Report & Lawyer Handoff System
-- Adds structured case summary, report versions, and lawyer notes.
-- =====================================================

-- 1. Case Summaries Table — structured JSON case data
create table if not exists case_summaries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  version int not null default 1,
  
  -- Case identification
  case_title text,
  case_category text,
  case_sub_category text,
  incident_date text,
  location text,
  
  -- Parties
  complainant_name text,
  complainant_role text,
  complainant_details text,
  opposite_party_name text,
  opposite_party_role text,
  opposite_party_details text,
  relationship_between_parties text,
  
  -- Summary content
  executive_summary text,
  key_facts jsonb default '[]'::jsonb,
  disputed_facts jsonb default '[]'::jsonb,
  
  -- Documents & evidence
  documents_list jsonb default '[]'::jsonb,
  evidence_list jsonb default '[]'::jsonb,
  witnesses jsonb default '[]'::jsonb,
  
  -- Legal analysis
  applicable_laws jsonb default '[]'::jsonb,
  legal_questions jsonb default '[]'::jsonb,
  ai_analysis text,
  ai_reasoning text,
  
  -- Case strength
  case_strength_score int,
  score_reasoning text,
  positive_factors jsonb default '[]'::jsonb,
  uncertain_factors jsonb default '[]'::jsonb,
  
  -- Actions
  actions_already_taken jsonb default '[]'::jsonb,
  recommended_next_steps jsonb default '[]'::jsonb,
  
  -- Timeline
  case_timeline jsonb default '[]'::jsonb,
  
  -- Missing info
  missing_information jsonb default '[]'::jsonb,
  questions_for_lawyer jsonb default '[]'::jsonb,
  
  -- Report metadata
  report_id text,
  report_status text default 'DRAFT' check (report_status in (
    'DRAFT', 'AI_GENERATING', 'READY', 'REQUEST_SENT', 
    'LAWYER_VIEWED_BRIEF', 'ACCEPTED', 'DECLINED', 
    'FULL_REPORT_UNLOCKED', 'UPDATED'
  )),
  short_brief text,
  
  -- Lawyer assignment
  assigned_lawyer_id uuid references lawyers(id) on delete set null,
  assigned_lawyer_name text,
  lawyer_accepted_at timestamptz,
  lawyer_request_status text default 'none' check (lawyer_request_status in (
    'none', 'pending', 'accepted', 'declined'
  )),
  
  -- Timestamps
  ai_generated_at timestamptz default now(),
  ai_last_updated_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(case_id, version)
);

-- 2. Lawyer Notes Table — private notes by assigned lawyer
create table if not exists lawyer_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  notes text,
  legal_strategy text,
  client_instructions text,
  next_hearing date,
  follow_up_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(case_id, lawyer_id)
);

-- 3. Extend lawyer_connections with summary reference and decline reason
alter table lawyer_connections add column if not exists case_summary_version int;
alter table lawyer_connections add column if not exists decline_reason text;

-- Indexes
create index if not exists idx_case_summaries_case_id on case_summaries(case_id);
create index if not exists idx_case_summaries_report_status on case_summaries(report_status);
create index if not exists idx_lawyer_notes_case_id on lawyer_notes(case_id);
create index if not exists idx_lawyer_notes_lawyer_id on lawyer_notes(lawyer_id);

-- Enable RLS
alter table case_summaries enable row level security;
alter table lawyer_notes enable row level security;

-- RLS Policies for case_summaries
-- Citizen can see their own case summaries
create policy "case_summaries_select_citizen" on case_summaries
for select using (
  exists (
    select 1 from cases
    where cases.id = case_summaries.case_id
      and cases.citizen_id = auth.uid()
  )
);

-- Assigned lawyer can see full summary only after acceptance
create policy "case_summaries_select_lawyer_accepted" on case_summaries
for select using (
  exists (
    select 1 from lawyer_connections lc
    join lawyers l on l.id = lc.lawyer_id
    where lc.case_id = case_summaries.case_id
      and l.profile_id = auth.uid()
      and lc.status = 'accepted'
  )
);

-- Citizen can insert/update their own case summaries
create policy "case_summaries_insert" on case_summaries
for insert with check (
  exists (
    select 1 from cases
    where cases.id = case_summaries.case_id
      and cases.citizen_id = auth.uid()
  )
);

create policy "case_summaries_update" on case_summaries
for update using (
  exists (
    select 1 from cases
    where cases.id = case_summaries.case_id
      and cases.citizen_id = auth.uid()
  )
);

-- RLS Policies for lawyer_notes
-- Assigned lawyer can read/write their own notes
create policy "lawyer_notes_select_lawyer" on lawyer_notes
for select using (
  exists (
    select 1 from lawyers l
    where l.id = lawyer_notes.lawyer_id
      and l.profile_id = auth.uid()
  )
);

create policy "lawyer_notes_insert_lawyer" on lawyer_notes
for insert with check (
  exists (
    select 1 from lawyers l
    where l.id = lawyer_notes.lawyer_id
      and l.profile_id = auth.uid()
  )
);

create policy "lawyer_notes_update_lawyer" on lawyer_notes
for update using (
  exists (
    select 1 from lawyers l
    where l.id = lawyer_notes.lawyer_id
      and l.profile_id = auth.uid()
  )
);

-- Citizen can see lawyer notes on their own cases
create policy "lawyer_notes_select_citizen" on lawyer_notes
for select using (
  exists (
    select 1 from cases
    where cases.id = lawyer_notes.case_id
      and cases.citizen_id = auth.uid()
  )
);

-- Grants
grant select, insert, update on case_summaries to authenticated;
grant select, insert, update on lawyer_notes to authenticated;
