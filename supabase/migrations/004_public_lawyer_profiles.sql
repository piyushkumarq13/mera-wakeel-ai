-- 004_public_lawyer_profiles.sql
-- Make lawyer profiles publicly readable for the directory.
-- Must be run AFTER 001_fix_lawyer_identity.sql, 002_lawyer_read_policies.sql, 003_backfill_lawyer_identity.sql
-- in the Supabase SQL editor for the fix to take effect in production.
-- Idempotent: uses DROP IF EXISTS before CREATE.

-- 1. RLS policy: allow anyone (anon + authenticated) to read a profiles row
--    when that row belongs to a registered lawyer (exists in lawyers table).
--    This is public professional information needed for the directory,
--    not private citizen data.
drop policy if exists "profiles_select_public_for_lawyers" on profiles;
create policy "profiles_select_public_for_lawyers" on profiles
for select using (
  exists (
    select 1 from lawyers l
    where l.profile_id = profiles.id
  )
);

-- 2. Grant: anon needs table-level SELECT on profiles for the policy above
--    to take effect (RLS policies only filter rows; the role must first
--    have the table privilege).
grant select on profiles to anon;