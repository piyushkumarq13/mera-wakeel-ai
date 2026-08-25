-- Enable pgvector extension first
create extension if not exists vector;

-- 1. Profiles Table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  user_type text not null check (user_type in ('citizen', 'lawyer')),
  preferred_language text default 'hindi' check (preferred_language in ('hindi', 'english', 'hinglish')),
  city text,
  state text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Lawyers Table
-- KYC columns: bar_council_state + verification_status (pending/verified/rejected) + verified_at.
create table if not exists lawyers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  specialty text[] default '{}',
  years_experience int default 0,
  bar_council_number text,
  bar_council_state text,
  verification_status text default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  is_verified boolean default false,
  bio text,
  consultation_fee_range text,
  rating_avg numeric(3,2) default 0,
  total_cases_handled int default 0,
  available boolean default true,
  profile_photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Cases Table
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references profiles(id) on delete cascade,
  title text,
  category text check (category in ('property', 'tenant', 'family', 'consumer', 'labour', 'other')),
  status text default 'ongoing' check (status in ('ongoing', 'assessed', 'closed', 'lawyer_connected')),
  ai_verdict text check (ai_verdict in ('user_correct', 'user_incorrect', 'needs_more_info')),
  ai_summary text,
  confidence_score numeric(3,2),
  assigned_lawyer_id uuid references lawyers(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Messages Table
-- language column stores the auto-detected language code (hi/en/hinglish/ta/te/mr/bn/kn/gu) per message for analytics.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'ai')),
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'voice', 'document_reference')),
  language text default 'hi',
  created_at timestamptz default now()
);

-- 5. Documents Table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  file_url text not null,
  document_type text check (document_type in ('stamp_paper', 'will', 'registry', 'sale_deed', 'power_of_attorney', 'affidavit', 'contract', 'court_notice', 'lease_agreement', 'legal_notice', 'other', 'unknown')),
  ai_extracted_text text,
  ai_analysis text,
  is_verified_valid boolean,
  uploaded_at timestamptz default now()
);

-- 6. Case Evidence Table
create table if not exists case_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  evidence_description text not null,
  is_available boolean default false,
  priority text default 'helpful' check (priority in ('critical', 'helpful', 'optional'))
);

-- 7. Lawyer Connections Table
create table if not exists lawyer_connections (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  citizen_id uuid not null references profiles(id) on delete cascade,
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  status text default 'requested' check (status in ('requested', 'accepted', 'rejected', 'completed')),
  requested_at timestamptz default now()
);

-- 8. Reviews Table
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  citizen_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz default now()
);

-- 9. Legal Knowledge Base Table
create table if not exists legal_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  act_name text not null,
  section_number text,
  content text not null,
  embedding vector(1536),
  category text check (category in ('property', 'tenant', 'family', 'consumer', 'labour', 'other'))
);

-- 10. Case Facts Table (Structured Memory per case)
create table if not exists case_facts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  fact_key text not null,
  fact_value text not null,
  updated_at timestamptz default now(),
  unique(case_id, fact_key)
);

-- 11. Profile Facts Table (Structured Memory per user/citizen across cases)
create table if not exists profile_facts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  fact_key text not null,
  fact_value text not null,
  updated_at timestamptz default now(),
  unique(profile_id, fact_key)
);

-- 12. Direct Messages Table (Chat between Citizen & Lawyer when request is accepted)
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references lawyer_connections(id) on delete cascade,
  sender_id text not null,
  sender_type text not null check (sender_type in ('lawyer', 'citizen')),
  content text,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  sent_at timestamptz default now()
);

-- 13. Case Deadlines Table (Deadline / court-date tracker, item 5)
create table if not exists case_deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  citizen_id uuid not null references profiles(id) on delete cascade,
  deadline_type text not null check (deadline_type in ('hearing', 'filing', 'response')),
  due_date timestamptz not null,
  notes text,
  reminder_sent boolean default false,
  created_at timestamptz default now()
);

-- 14. Generated Documents Table (item 4 - AI drafted legal documents)
create table if not exists generated_documents (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references profiles(id) on delete cascade,
  template_key text not null,
  title text not null,
  content text,
  file_url text,
  model text,
  created_at timestamptz default now()
);

-- 15. WhatsApp Sessions Table (item 6 - map phone -> citizen/guest session)
create table if not exists whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  citizen_id uuid references profiles(id) on delete set null,
  is_guest boolean default true,
  last_message text,
  updated_at timestamptz default now()
);

-- 16. Analytics Events Table (item 10 - lightweight product analytics)
create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  user_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);

-- Indexes on Foreign Key columns for performance
create index if not exists idx_lawyers_profile_id on lawyers(profile_id);
create index if not exists idx_cases_citizen_id on cases(citizen_id);
create index if not exists idx_cases_assigned_lawyer on cases(assigned_lawyer_id);
create index if not exists idx_messages_case_id on messages(case_id);
create index if not exists idx_documents_case_id on documents(case_id);
create index if not exists idx_case_evidence_case_id on case_evidence(case_id);
create index if not exists idx_lawyer_connections_case_id on lawyer_connections(case_id);
create index if not exists idx_lawyer_connections_citizen_id on lawyer_connections(citizen_id);
create index if not exists idx_lawyer_connections_lawyer_id on lawyer_connections(lawyer_id);
create index if not exists idx_reviews_lawyer_id on reviews(lawyer_id);
create index if not exists idx_reviews_citizen_id on reviews(citizen_id);
create index if not exists idx_case_facts_case_id on case_facts(case_id);
create index if not exists idx_profile_facts_profile_id on profile_facts(profile_id);
create index if not exists idx_direct_messages_connection_id on direct_messages(connection_id);
create index if not exists idx_direct_messages_sent_at on direct_messages(sent_at);
create index if not exists idx_case_deadlines_case_id on case_deadlines(case_id);
create index if not exists idx_case_deadlines_citizen_id on case_deadlines(citizen_id);
create index if not exists idx_case_deadlines_due_date on case_deadlines(due_date);
create index if not exists idx_generated_documents_citizen_id on generated_documents(citizen_id);
create index if not exists idx_analytics_events_name on analytics_events(event_name);
create index if not exists idx_analytics_events_created_at on analytics_events(created_at);

-- 17. Case Summaries Table (structured case report data)
create table if not exists case_summaries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  version int not null default 1,
  case_title text,
  case_category text,
  case_sub_category text,
  incident_date text,
  location text,
  complainant_name text,
  complainant_role text,
  complainant_details text,
  opposite_party_name text,
  opposite_party_role text,
  opposite_party_details text,
  relationship_between_parties text,
  executive_summary text,
  key_facts jsonb default '[]'::jsonb,
  disputed_facts jsonb default '[]'::jsonb,
  documents_list jsonb default '[]'::jsonb,
  evidence_list jsonb default '[]'::jsonb,
  witnesses jsonb default '[]'::jsonb,
  applicable_laws jsonb default '[]'::jsonb,
  legal_questions jsonb default '[]'::jsonb,
  ai_analysis text,
  ai_reasoning text,
  case_strength_score int,
  score_reasoning text,
  positive_factors jsonb default '[]'::jsonb,
  uncertain_factors jsonb default '[]'::jsonb,
  actions_already_taken jsonb default '[]'::jsonb,
  recommended_next_steps jsonb default '[]'::jsonb,
  case_timeline jsonb default '[]'::jsonb,
  missing_information jsonb default '[]'::jsonb,
  questions_for_lawyer jsonb default '[]'::jsonb,
  report_id text,
  report_status text default 'DRAFT',
  short_brief text,
  assigned_lawyer_id uuid references lawyers(id) on delete set null,
  assigned_lawyer_name text,
  lawyer_accepted_at timestamptz,
  lawyer_request_status text default 'none',
  ai_generated_at timestamptz default now(),
  ai_last_updated_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(case_id, version)
);

-- 18. Lawyer Notes Table
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

create index if not exists idx_case_summaries_case_id on case_summaries(case_id);
create index if not exists idx_case_summaries_report_status on case_summaries(report_status);
create index if not exists idx_lawyer_notes_case_id on lawyer_notes(case_id);
create index if not exists idx_lawyer_notes_lawyer_id on lawyer_notes(lawyer_id);

-- Enable Row Level Security (RLS) on all tables for production data protection
alter table profiles enable row level security;
alter table lawyers enable row level security;
alter table cases enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;
alter table case_evidence enable row level security;
alter table lawyer_connections enable row level security;
alter table reviews enable row level security;
alter table legal_knowledge_base enable row level security;
alter table case_facts enable row level security;
alter table profile_facts enable row level security;
alter table direct_messages enable row level security;
alter table case_deadlines enable row level security;
alter table generated_documents enable row level security;
alter table whatsapp_sessions enable row level security;
alter table analytics_events enable row level security;

-- RLS Policies

-- profiles policies
create policy "Users can select own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Lawyer profiles are public professional info, needed for the directory listing
create policy "profiles_select_public_for_lawyers" on profiles
for select using (
  exists (
    select 1 from lawyers l
    where l.profile_id = profiles.id
  )
);

-- lawyers policies
create policy "Anyone can select lawyers" on lawyers
  for select using (true);

create policy "Lawyer owner can insert" on lawyers
  for insert with check (auth.uid() = profile_id);

create policy "Lawyer owner can update" on lawyers
  for update using (auth.uid() = profile_id);

-- cases policies
create policy "Citizens can select own cases" on cases
  for select using (auth.uid() = citizen_id);

create policy "Citizens can insert own cases" on cases
  for insert with check (auth.uid() = citizen_id);

create policy "Citizens can update own cases" on cases
  for update using (auth.uid() = citizen_id);

-- messages policies
create policy "Case messages select" on messages
  for select using (
    exists (
      select 1 from cases
      where cases.id = messages.case_id
      and cases.citizen_id = auth.uid()
    )
  );

create policy "Case messages insert" on messages
  for insert with check (
    exists (
      select 1 from cases
      where cases.id = messages.case_id
      and cases.citizen_id = auth.uid()
    )
  );

-- documents policies
create policy "Case documents select" on documents
  for select using (
    exists (
      select 1 from cases
      where cases.id = documents.case_id
      and cases.citizen_id = auth.uid()
    )
  );

create policy "Case documents insert" on documents
  for insert with check (
    exists (
      select 1 from cases
      where cases.id = documents.case_id
      and cases.citizen_id = auth.uid()
    )
  );

create policy "Case documents update" on documents
  for update using (
    exists (
      select 1 from cases
      where cases.id = documents.case_id
      and cases.citizen_id = auth.uid()
    )
  );

-- case_evidence policies
create policy "Case evidence select" on case_evidence
  for select using (
    exists (
      select 1 from cases
      where cases.id = case_evidence.case_id
      and cases.citizen_id = auth.uid()
    )
  );

create policy "Case evidence insert" on case_evidence
  for insert with check (
    exists (
      select 1 from cases
      where cases.id = case_evidence.case_id
      and cases.citizen_id = auth.uid()
    )
  );

-- lawyer_connections policies
create policy "Lawyer connections select" on lawyer_connections
  for select using (
    auth.uid() = citizen_id or exists (
      select 1 from lawyers
      where lawyers.id = lawyer_connections.lawyer_id
      and lawyers.profile_id = auth.uid()
    )
  );

create policy "Lawyer connections insert" on lawyer_connections
  for insert with check (auth.uid() = citizen_id);

-- reviews policies
create policy "Anyone can select reviews" on reviews
  for select using (true);

-- Only a citizen who had a completed (accepted) consultation with the lawyer may review.
create policy "Citizens can insert reviews" on reviews
  for insert with check (
    auth.uid() = citizen_id and exists (
      select 1 from lawyer_connections
      where lawyer_connections.citizen_id = reviews.citizen_id
      and lawyer_connections.lawyer_id = reviews.lawyer_id
      and lawyer_connections.status in ('accepted', 'completed')
    )
  );

-- legal_knowledge_base policies
create policy "Anyone can select legal knowledge base" on legal_knowledge_base
  for select using (true);

-- case_facts policies
create policy "Case facts select" on case_facts
  for select using (
    exists (
      select 1 from cases
      where cases.id = case_facts.case_id
      and cases.citizen_id = auth.uid()
    )
  );

create policy "Case facts insert" on case_facts
  for insert with check (
    exists (
      select 1 from cases
      where cases.id = case_facts.case_id
      and cases.citizen_id = auth.uid()
    )
  );

create policy "Case facts update" on case_facts
  for update using (
    exists (
      select 1 from cases
      where cases.id = case_facts.case_id
      and cases.citizen_id = auth.uid()
    )
  );

-- profile_facts policies
create policy "Profile facts select" on profile_facts
  for select using (auth.uid() = profile_id);

create policy "Profile facts insert" on profile_facts
  for insert with check (auth.uid() = profile_id);

create policy "Profile facts update" on profile_facts
  for update using (auth.uid() = profile_id);

-- direct_messages policies
create policy "Direct messages select" on direct_messages
  for select using (true);

create policy "Direct messages insert" on direct_messages
  for insert with check (true);

-- case_deadlines policies (owner-only)
create policy "Case deadlines select" on case_deadlines
  for select using (auth.uid() = citizen_id);

create policy "Case deadlines insert" on case_deadlines
  for insert with check (auth.uid() = citizen_id);

create policy "Case deadlines update" on case_deadlines
  for update using (auth.uid() = citizen_id);

create policy "Case deadlines delete" on case_deadlines
  for delete using (auth.uid() = citizen_id);

-- generated_documents policies (owner-only)
create policy "Generated documents select" on generated_documents
  for select using (auth.uid() = citizen_id);

create policy "Generated documents insert" on generated_documents
  for insert with check (auth.uid() = citizen_id);

-- whatsapp_sessions policies (admin / service-role only via server proxies; anon cannot read or write)
create policy "No anon select on whatsapp_sessions" on whatsapp_sessions
  for select using (false);

create policy "No anon insert on whatsapp_sessions" on whatsapp_sessions
  for insert with check (false);

-- analytics_events policies (server proxy only; anon cannot read or write directly)
create policy "No anon select on analytics_events" on analytics_events
  for select using (false);

create policy "No anon insert on analytics_events" on analytics_events
  for insert with check (false);

-- Least-privilege grants: only the operations each RLS policy requires, instead
-- of a blanket "grant all". Row-level policies remain the real gate-keeper; the
-- server uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) for /api/db/* writes, so
-- direct anon/authenticated grants mirror only the client fallbacks.
grant usage on schema public to anon, authenticated;

grant select on lawyers to anon;
grant select on reviews to anon;
grant select on legal_knowledge_base to anon;
grant select on profiles to anon;

grant select on profiles to authenticated;
grant insert, update on profiles to authenticated;
grant select, insert, update on lawyers to authenticated;
grant select, insert, update on cases to authenticated;
grant select, insert on messages to authenticated;
grant select, insert, update, delete on documents to authenticated;
grant select, insert, update, delete on case_evidence to authenticated;
grant select, insert, update on lawyer_connections to authenticated;
grant select, insert on reviews to authenticated;
grant select, insert, delete on legal_knowledge_base to authenticated;
grant select, insert, update on case_facts to authenticated;
grant select, insert, update on profile_facts to authenticated;
grant select, insert on direct_messages to authenticated;
grant select, insert, update, delete on case_deadlines to authenticated;
grant select, insert on generated_documents to authenticated;
grant select, insert, update on case_summaries to authenticated;
grant select, insert, update on lawyer_notes to authenticated;

-- whatsapp_sessions and analytics_events are written only via the service role;
-- neither anon nor authenticated receives any grant on them.

-- case_summaries policies
create policy "Case summaries select citizen" on case_summaries
  for select using (
    exists (select 1 from cases where cases.id = case_summaries.case_id and cases.citizen_id = auth.uid())
  );

create policy "Case summaries select lawyer" on case_summaries
  for select using (
    exists (
      select 1 from lawyer_connections lc
      join lawyers l on l.id = lc.lawyer_id
      where lc.case_id = case_summaries.case_id and l.profile_id = auth.uid() and lc.status = 'accepted'
    )
  );

create policy "Case summaries insert" on case_summaries
  for insert with check (
    exists (select 1 from cases where cases.id = case_summaries.case_id and cases.citizen_id = auth.uid())
  );

create policy "Case summaries update" on case_summaries
  for update using (
    exists (select 1 from cases where cases.id = case_summaries.case_id and cases.citizen_id = auth.uid())
  );

-- lawyer_notes policies
create policy "Lawyer notes select lawyer" on lawyer_notes
  for select using (
    exists (select 1 from lawyers l where l.id = lawyer_notes.lawyer_id and l.profile_id = auth.uid())
  );

create policy "Lawyer notes insert lawyer" on lawyer_notes
  for insert with check (
    exists (select 1 from lawyers l where l.id = lawyer_notes.lawyer_id and l.profile_id = auth.uid())
  );

create policy "Lawyer notes update lawyer" on lawyer_notes
  for update using (
    exists (select 1 from lawyers l where l.id = lawyer_notes.lawyer_id and l.profile_id = auth.uid())
  );

create policy "Lawyer notes select citizen" on lawyer_notes
  for select using (
    exists (select 1 from cases where cases.id = lawyer_notes.case_id and cases.citizen_id = auth.uid())
  );


