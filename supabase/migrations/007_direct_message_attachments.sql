-- PART 2.1: Add attachment columns to direct_messages and make content nullable
-- PART 2.2: Create private storage bucket for direct message attachments with RLS

-- 1. Add attachment columns
alter table direct_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text;

-- 2. Make content nullable (attachment-only messages have no text)
alter table direct_messages alter column content drop not null;

-- 3. Create private storage bucket for direct message attachments
insert into storage.buckets (id, name, public)
values ('direct-message-attachments', 'direct-message-attachments', false)
on conflict (id) do nothing;

-- 4. Storage RLS: only authenticated users can insert
create policy "dm_attachments_insert_authenticated" on storage.objects
for insert to authenticated
with check (bucket_id = 'direct-message-attachments');

-- 5. Storage RLS: authenticated users can select (needed for createSignedUrl)
create policy "dm_attachments_select_authenticated" on storage.objects
for select to authenticated
using (bucket_id = 'direct-message-attachments');
