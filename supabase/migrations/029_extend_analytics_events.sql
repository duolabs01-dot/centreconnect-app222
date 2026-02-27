-- Ensure the type exists first (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ecd_analytics_event_type') THEN
    CREATE TYPE ecd_analytics_event_type AS ENUM (
      'profile_view',
      'whatsapp_click',
      'call_click',
      'application_submitted'
    );
  END IF;
END
$$;

-- Add new values to ecd_analytics_event_type enum
-- Note: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block.
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'page_view';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'page_duration';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'pickup_verified';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'announcement_sent';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'compliance_uploaded';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'parent_invite_sent';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'invoice_paid';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'marketplace_requested';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'referral_used';

-- Add new columns to ecd_analytics_events
-- This assumes ecd_analytics_events table exists from migration 006
ALTER TABLE ecd_analytics_events 
ADD COLUMN IF NOT EXISTS actor_role text,
ADD COLUMN IF NOT EXISTS path text,
ADD COLUMN IF NOT EXISTS duration_ms integer,
ADD COLUMN IF NOT EXISTS session_id text;
