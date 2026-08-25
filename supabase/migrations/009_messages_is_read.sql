-- Migration 009: Add is_read to direct_messages + enable realtime
-- Run in Supabase Dashboard SQL Editor

-- 1. Add is_read column (default false = unread)
ALTER TABLE direct_messages
ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN direct_messages.is_read IS 'Whether the message has been read by the recipient. Citizens mark lawyer messages as read; lawyers mark citizen messages as read.';

-- 2. Enable realtime for direct_messages (required for Supabase Realtime subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- 3. Also enable realtime for lawyer_connections (for live status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE lawyer_connections;
