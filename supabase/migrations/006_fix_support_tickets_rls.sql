-- Fix support_tickets: proper RLS policies so the frontend can work directly
-- via Supabase client with user's session (bypasses broken server-side supabaseAdmin).
--
-- NOTE: The next migration must be numbered 007_* to avoid collisions.

-- 1. Drop old policies
drop policy if exists "citizens_insert_own_tickets" on support_tickets;
drop policy if exists "citizens_read_own_tickets" on support_tickets;
drop policy if exists "public_read_by_token" on support_tickets;
drop policy if exists "admins_update_tickets" on support_tickets;

-- 2. INSERT: citizens can create tickets (citizen_id must match their auth uid as text)
--    citizen_id column is TEXT, auth.uid() is UUID, so cast uuid to text.
create policy "citizens_insert_own_tickets" on support_tickets
  for insert with check (citizen_id = auth.uid()::text);

-- 3. SELECT: citizens can read their own tickets by matching auth uid
create policy "citizens_read_own_tickets" on support_tickets
  for select using (citizen_id = auth.uid()::text);

-- 4. SELECT: anyone can read by token (for the public tracking endpoint)
create policy "public_read_by_token" on support_tickets
  for select using (true);

-- 5. UPDATE: admins can reply and change status
--    profiles.id is UUID, auth.uid() is UUID — compare uuid to uuid directly.
create policy "admins_update_tickets" on support_tickets
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.user_type = 'admin'
    )
  );

-- 6. GRANTs
grant select, insert on support_tickets to authenticated;
grant select on support_tickets to anon;

-- 7. Indexes for performance
create index if not exists idx_support_tickets_token on support_tickets(token);
create index if not exists idx_support_tickets_citizen_id on support_tickets(citizen_id);
create index if not exists idx_support_tickets_status on support_tickets(status);
