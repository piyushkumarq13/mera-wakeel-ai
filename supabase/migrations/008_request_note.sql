-- Migration 008: Add request_note to lawyer_connections and citizen_note to cases
-- These columns support the restructured "Request Advocate" flow where
-- citizens can describe their issue directly without needing an existing case.

-- 1. Add request_note column to lawyer_connections
ALTER TABLE lawyer_connections
ADD COLUMN IF NOT EXISTS request_note text;

COMMENT ON COLUMN lawyer_connections.request_note IS 'Citizen-provided description of their legal issue, visible to the lawyer without opening the case.';

-- 2. Add citizen_note column to cases
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS citizen_note text;

COMMENT ON COLUMN cases.citizen_note IS 'Citizen-authored initial description/note for the case, distinct from AI-generated ai_summary.';
