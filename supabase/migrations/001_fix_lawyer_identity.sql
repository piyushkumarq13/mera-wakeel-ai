-- 001_fix_lawyer_identity.sql
-- Unify lawyer identity across the app.
--
-- Two representations of a "lawyer" exist:
--   1. lawyers.id      -> the actual row id (FK target for lawyer_connections.lawyer_id,
--                         cases.assigned_lawyer_id, reviews.lawyer_id)
--   2. lawyers.profile_id -> references profiles.id (which equals auth.users.id for real
--                         registered advocates, or a seeded UUID for demo advocates)
--
-- These helpers translate between the two so the server can always store/query the
-- canonical lawyers.id regardless of which id the client passes in.

-- Resolve the canonical lawyers row id for a given profile id (auth user id / seed uuid).
CREATE OR REPLACE FUNCTION public.resolve_lawyer_row(profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.lawyers WHERE profile_id = $1 LIMIT 1
$$;

-- Resolve the profile id (auth user id / seed uuid) for a given lawyers row id.
CREATE OR REPLACE FUNCTION public.resolve_lawyer_profile(lawyer_row_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT profile_id FROM public.lawyers WHERE id = $1 LIMIT 1
$$;

-- Marker column so demo advocates can be flagged and hidden/shown deliberately.
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;