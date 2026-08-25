-- 002_lawyer_read_policies.sql
-- Restrict lawyer reads of case data to ACCEPTED or COMPLETED connections only.
--
-- Before this migration, lawyers could read a case's chat messages as soon as a
-- request was merely PENDING, and could read the case itself via any connection.
-- That leaks case details (statements, documents, verdicts) before the citizen
-- has accepted the advocate. These policies re-create the existing SELECT
-- policies with a strict status gate: lawyers may only read cases, messages,
-- and documents for connections whose status is 'accepted' or 'completed'.
--
-- Idempotent: drops each policy first, then re-creates it, so it is safe to run
-- in the Supabase SQL editor multiple times.
--
-- Note: a citizen reading their own data is unaffected (that branch is kept).

-- ---------- CASES ----------
drop policy if exists "cases_select_via_connection" on cases;
create policy "cases_select_via_connection" on cases
for select using (
  exists (
    select 1 from lawyer_connections lc
    join lawyers l on l.id = lc.lawyer_id
    where lc.case_id = cases.id
      and l.profile_id = auth.uid()
      and lc.status in ('accepted', 'completed')
  )
);

-- ---------- MESSAGES (case chat: user + AI) ----------
drop policy if exists "messages_select" on messages;
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
      and lc.status in ('accepted', 'completed')
  )
);

-- ---------- DOCUMENTS ----------
drop policy if exists "documents_select" on documents;
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
      and lc.status in ('accepted', 'completed')
  )
);