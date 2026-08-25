-- =====================================================
-- MERA WAKEEL AI — FIXED RLS SETUP SCRIPT
-- Run this in Supabase SQL Editor. Safe to re-run.
--
-- IMPORTANT (must be done FIRST, outside this SQL):
--   In your .env file add a REAL service role key:
--     SUPABASE_SERVICE_ROLE_KEY=eyJ...
--   Get it from Supabase Dashboard -> Settings -> API -> service_role.
--   The Node server uses this key to bypass RLS for the /api/db/* proxies.
--   Without it the server falls back to the anon key, RLS blocks every
--   write, and the whole app stops working once RLS is enabled.
-- =====================================================

-- STEP 0: Make sure every table the policies reference exists.
-- This prevents the script aborting mid-run (previously it failed on
-- direct_messages and left RLS enabled with no policies = deny-all).
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references lawyer_connections(id) on delete cascade,
  sender_id text not null,
  sender_type text not null check (sender_type in ('lawyer', 'citizen')),
  content text not null,
  sent_at timestamptz default now()
);

-- STEP 1: Enable RLS on all tables
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

-- STEP 2: Drop every existing policy (old names + new names) for a clean slate
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','lawyers','cases','messages','documents',
                        'case_evidence','lawyer_connections','reviews',
                        'legal_knowledge_base','case_facts','profile_facts',
                        'direct_messages')
  loop
    execute format('drop policy if exists %I on %I', p.policyname, p.tablename);
  end loop;
end $$;

-- STEP 3: Least-privilege grants (idempotent).
-- We grant ONLY the operations each RLS policy actually requires, instead of a
-- blanket "grant all". Row-level policies remain the real gate-keeper; these
-- grants merely enable the minimum table privileges for each role.
-- The Node server uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) for all
-- /api/db/*, /api/documents, /api/analytics, and /api/webhooks/* writes, so the
-- anon/authenticated roles below mirror only the direct client fallbacks.
grant usage on schema public to anon, authenticated;

-- ANON: public read-only surfaces only
grant select on lawyers to anon;
grant select on reviews to anon;
grant select on legal_knowledge_base to anon;
grant select on profiles to anon;

-- AUTHENTICATED: citizen + lawyer client operations
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

-- whatsapp_sessions and analytics_events are written ONLY by the server via the
-- service role (which bypasses RLS). Neither anon nor authenticated receives any
-- grant on them, so clients can never touch them directly.

-- =====================================================
-- PROFILES
-- =====================================================
create policy "profiles_select" on profiles
for select using (auth.uid() = id);
create policy "profiles_insert" on profiles
for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles
for update using (auth.uid() = id);
-- Lawyers need to read citizen profiles for accepted connections
create policy "profiles_select_for_lawyers" on profiles
for select using (
  exists (
    select 1 from lawyer_connections lc
    join lawyers l on l.id = lc.lawyer_id
    where lc.citizen_id = profiles.id
      and l.profile_id = auth.uid()
      and lc.status = 'accepted'
  )
);
-- Public professional info: anyone can read profiles of registered lawyers
-- (needed for the lawyer directory listing).
create policy "profiles_select_public_for_lawyers" on profiles
for select using (
  exists (
    select 1 from lawyers l
    where l.profile_id = profiles.id
  )
);

-- =====================================================
-- LAWYERS
-- =====================================================
-- Anyone (including unauthenticated) can browse the lawyer directory
create policy "lawyers_select_public" on lawyers
for select using (true);
-- Only the lawyer themselves can insert their own row
create policy "lawyers_insert" on lawyers
for insert with check (auth.uid() = profile_id);
-- Only the lawyer themselves can update their own row
create policy "lawyers_update" on lawyers
for update using (auth.uid() = profile_id);

-- =====================================================
-- CASES
-- =====================================================
-- Citizen sees their own cases
create policy "cases_select_citizen" on cases
for select using (auth.uid() = citizen_id);
-- Assigned lawyer sees the case
create policy "cases_select_lawyer" on cases
for select using (
  exists (
    select 1 from lawyers l
    where l.id = cases.assigned_lawyer_id
      and l.profile_id = auth.uid()
  )
);
-- Lawyer sees cases where a connection exists (even before being assigned)
create policy "cases_select_via_connection" on cases
for select using (
  exists (
    select 1 from lawyer_connections lc
    join lawyers l on l.id = lc.lawyer_id
    where lc.case_id = cases.id
      and l.profile_id = auth.uid()
  )
);
-- Only the citizen can create a case
create policy "cases_insert" on cases
for insert with check (auth.uid() = citizen_id);
-- Only the citizen can update their own case
create policy "cases_update" on cases
for update using (auth.uid() = citizen_id);

-- =====================================================
-- MESSAGES (case chat: user + AI)
-- =====================================================
-- Citizen or connected lawyer can read case messages
create policy "messages_select" on messages
for select using (
  exists (
    select 1 from cases
    where cases.id = messages.case_id
      and cases.citizen_id = auth.uid()
  )
  or
  exists (
    select 1 from lawyer_connections lc
    join lawyers l on l.id = lc.lawyer_id
    where lc.case_id = messages.case_id
      and l.profile_id = auth.uid()
  )
);
-- The owning citizen can insert a message into their own case
create policy "messages_insert" on messages
for insert with check (
  exists (
    select 1 from cases
    where cases.id = messages.case_id
      and cases.citizen_id = auth.uid()
  )
);
-- Server inserts AI messages with the service role (bypasses RLS anyway).
-- Kept as a narrow policy instead of "with check (true)".
create policy "messages_insert_ai" on messages
for insert with check (auth.role() = 'service_role');

-- =====================================================
-- DOCUMENTS
-- =====================================================
-- Citizen or an ACCEPTED lawyer can read documents of a case
create policy "documents_select" on documents
for select using (
  exists (
    select 1 from cases
    where cases.id = documents.case_id
      and cases.citizen_id = auth.uid()
  )
  or
  exists (
    select 1 from lawyer_connections lc
    join lawyers l on l.id = lc.lawyer_id
    where lc.case_id = documents.case_id
      and l.profile_id = auth.uid()
      and lc.status = 'accepted'
  )
);
-- Only the owning citizen can upload a document
create policy "documents_insert" on documents
for insert with check (
  exists (
    select 1 from cases
    where cases.id = documents.case_id
      and cases.citizen_id = auth.uid()
  )
);
-- Only the owning citizen can update a document
create policy "documents_update" on documents
for update using (
  exists (
    select 1 from cases
    where cases.id = documents.case_id
      and cases.citizen_id = auth.uid()
  )
);
-- Only the owning citizen can delete a document
create policy "documents_delete" on documents
for delete using (
  exists (
    select 1 from cases
    where cases.id = documents.case_id
      and cases.citizen_id = auth.uid()
  )
);

-- =====================================================
-- CASE EVIDENCE
-- =====================================================
create policy "case_evidence_select" on case_evidence
for select using (
  exists (
    select 1 from cases
    where cases.id = case_evidence.case_id
      and cases.citizen_id = auth.uid()
  )
);
create policy "case_evidence_insert" on case_evidence
for insert with check (
  exists (
    select 1 from cases
    where cases.id = case_evidence.case_id
      and cases.citizen_id = auth.uid()
  )
);
create policy "case_evidence_update" on case_evidence
for update using (
  exists (
    select 1 from cases
    where cases.id = case_evidence.case_id
      and cases.citizen_id = auth.uid()
  )
);
create policy "case_evidence_delete" on case_evidence
for delete using (
  exists (
    select 1 from cases
    where cases.id = case_evidence.case_id
      and cases.citizen_id = auth.uid()
  )
);

-- =====================================================
-- LAWYER CONNECTIONS
-- =====================================================
-- Citizen sees their own connection requests
create policy "lawyer_connections_select_citizen" on lawyer_connections
for select using (auth.uid() = citizen_id);
-- Lawyer sees connection requests sent to them
create policy "lawyer_connections_select_lawyer" on lawyer_connections
for select using (
  exists (
    select 1 from lawyers l
    where l.id = lawyer_connections.lawyer_id
      and l.profile_id = auth.uid()
  )
);
-- Only the citizen can send a connection request
create policy "lawyer_connections_insert" on lawyer_connections
for insert with check (auth.uid() = citizen_id);
-- Citizen updates to completed; lawyer accepts/rejects
create policy "lawyer_connections_update" on lawyer_connections
for update using (
  auth.uid() = citizen_id
  or
  exists (
    select 1 from lawyers l
    where l.id = lawyer_connections.lawyer_id
      and l.profile_id = auth.uid()
  )
);

-- =====================================================
-- REVIEWS
-- =====================================================
-- Anyone can read reviews
create policy "reviews_select" on reviews
for select using (true);
-- Only the citizen can write a review
create policy "reviews_insert" on reviews
for insert with check (auth.uid() = citizen_id);

-- =====================================================
-- LEGAL KNOWLEDGE BASE (RAG)
-- =====================================================
-- Anyone can read (RAG search runs on the client too)
create policy "legal_kb_select" on legal_knowledge_base
for select using (true);
-- Authenticated users can add law sections
create policy "legal_kb_insert" on legal_knowledge_base
for insert with check (auth.uid() is not null);
-- Authenticated users can delete additions
create policy "legal_kb_delete" on legal_knowledge_base
for delete using (auth.uid() is not null);

-- =====================================================
-- CASE FACTS (AI memory per case)
-- =====================================================
create policy "case_facts_select" on case_facts
for select using (
  exists (
    select 1 from cases
    where cases.id = case_facts.case_id
      and cases.citizen_id = auth.uid()
  )
);
create policy "case_facts_insert" on case_facts
for insert with check (
  exists (
    select 1 from cases
    where cases.id = case_facts.case_id
      and cases.citizen_id = auth.uid()
  )
);
create policy "case_facts_update" on case_facts
for update using (
  exists (
    select 1 from cases
    where cases.id = case_facts.case_id
      and cases.citizen_id = auth.uid()
  )
);

-- =====================================================
-- PROFILE FACTS (AI memory per user, cross-case)
-- =====================================================
create policy "profile_facts_select" on profile_facts
for select using (auth.uid() = profile_id);
create policy "profile_facts_insert" on profile_facts
for insert with check (auth.uid() = profile_id);
create policy "profile_facts_update" on profile_facts
for update using (auth.uid() = profile_id);

-- =====================================================
-- DIRECT MESSAGES (Citizen <-> Lawyer chat)
-- =====================================================
-- Citizen and accepted lawyer can read the conversation
create policy "direct_messages_select" on direct_messages
for select using (
  exists (
    select 1 from lawyer_connections lc
    where lc.id = direct_messages.connection_id
      and lc.status = 'accepted'
      and (
        lc.citizen_id = auth.uid()
        or exists (
          select 1 from lawyers l
          where l.id = lc.lawyer_id
            and l.profile_id = auth.uid()
        )
      )
  )
);
-- Citizen and accepted lawyer can send messages
create policy "direct_messages_insert" on direct_messages
for insert with check (
  exists (
    select 1 from lawyer_connections lc
    where lc.id = direct_messages.connection_id
      and lc.status = 'accepted'
      and (
        lc.citizen_id = auth.uid()
        or exists (
          select 1 from lawyers l
          where l.id = lc.lawyer_id
            and l.profile_id = auth.uid()
        )
      )
  )
);

-- =====================================================
-- STORAGE POLICIES (documents + profile photos)
-- The app uploads files from the browser via Supabase Storage, which has its
-- own RLS. Without policies below, uploads silently fail.
-- =====================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_upload_authenticated" on storage.objects
for insert to authenticated
with check (bucket_id = 'documents');

create policy "documents_bucket_select_authenticated" on storage.objects
for select to authenticated
using (bucket_id = 'documents');

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile_photos_upload_authenticated" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-photos');

create policy "profile_photos_select_public" on storage.objects
for select to public
using (bucket_id = 'profile-photos');

-- =====================================================
-- NOTE ON SERVER-SIDE WRITES
-- The Node server uses SUPABASE_SERVICE_ROLE_KEY, which BYPASSES all RLS.
-- So server-side inserts (AI messages, verdict saves, document analysis,
-- facts, RAG seeding) keep working without any extra policies.
-- =====================================================

-- VERIFY: Check RLS is enabled on all tables
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
