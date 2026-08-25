-- 003_backfill_lawyer_identity.sql
-- Repair existing mismatched lawyer rows where lawyers.id != lawyers.profile_id.
-- This migration must be run AFTER 001_fix_lawyer_identity.sql and 002_lawyer_read_policies.sql
-- in the Supabase SQL editor. It is idempotent and safe to re-run.
--
-- Strategy:
-- 1. Drop ALL FK constraints that reference lawyers.id
-- 2. Update all referencing tables to point to profile_id (the target id)
-- 3. Update lawyers.id = profile_id for all mismatched rows
-- 4. Re-create FK constraints
-- 5. Re-apply resolver RPCs

BEGIN;

-- 1. Drop ALL FK constraints that reference lawyers.id
-- (using IF EXISTS so re-running is safe)
ALTER TABLE public.lawyer_connections DROP CONSTRAINT IF EXISTS lawyer_connections_lawyer_id_fkey;
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_assigned_lawyer_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_lawyer_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_lawyer_id_fkey;

-- 2. Update ALL referencing tables to point to profile_id FIRST
-- (profile_id is the target value that lawyers.id will become)

-- lawyer_connections: old lawyer_id was the OLD lawyers.id, change to profile_id
UPDATE public.lawyer_connections lc
SET lawyer_id = l.profile_id
FROM public.lawyers l
WHERE lc.lawyer_id = l.id
  AND l.id != l.profile_id;

-- cases.assigned_lawyer_id: old value was OLD lawyers.id, change to profile_id
UPDATE public.cases c
SET assigned_lawyer_id = l.profile_id
FROM public.lawyers l
WHERE c.assigned_lawyer_id = l.id
  AND l.id != l.profile_id;

-- reviews.lawyer_id: old value was OLD lawyers.id, change to profile_id
UPDATE public.reviews r
SET lawyer_id = l.profile_id
FROM public.lawyers l
WHERE r.lawyer_id = l.id
  AND l.id != l.profile_id;

-- appointments.lawyer_id: old value was OLD lawyers.id, change to profile_id
UPDATE public.appointments a
SET lawyer_id = l.profile_id
FROM public.lawyers l
WHERE a.lawyer_id = l.id
  AND l.id != l.profile_id;

-- 3. NOW update lawyers.id = profile_id for all mismatched rows
UPDATE public.lawyers
SET id = profile_id,
    updated_at = now()
WHERE id != profile_id;

-- 4. Re-create FK constraints
ALTER TABLE public.lawyer_connections
  ADD CONSTRAINT lawyer_connections_lawyer_id_fkey
  FOREIGN KEY (lawyer_id) REFERENCES public.lawyers(id) ON DELETE CASCADE;

ALTER TABLE public.cases
  ADD CONSTRAINT cases_assigned_lawyer_id_fkey
  FOREIGN KEY (assigned_lawyer_id) REFERENCES public.lawyers(id) ON DELETE SET NULL;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_lawyer_id_fkey
  FOREIGN KEY (lawyer_id) REFERENCES public.lawyers(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_lawyer_id_fkey
  FOREIGN KEY (lawyer_id) REFERENCES public.lawyers(id) ON DELETE CASCADE;

COMMIT;

-- Re-apply resolver RPCs from 001 (idempotent)
CREATE OR REPLACE FUNCTION public.resolve_lawyer_row(profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.lawyers WHERE profile_id = $1 LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.resolve_lawyer_profile(lawyer_row_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT profile_id FROM public.lawyers WHERE id = $1 LIMIT 1
$$;