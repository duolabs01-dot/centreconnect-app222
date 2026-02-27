-- 1. Ensure the enum exists (idempotent)
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

-- 2. Add new values to ecd_analytics_event_type enum
-- Note: ADD VALUE IF NOT EXISTS is supported in PG 13+
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'page_view';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'page_duration';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'pickup_verified';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'announcement_sent';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'compliance_uploaded';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'parent_invite_sent';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'invoice_paid';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'marketplace_requested';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'referral_used';

-- 3. Ensure the table exists (idempotent)
-- We create it with basic columns first to ensure the relation exists for subsequent ALTERs.
CREATE TABLE IF NOT EXISTS ecd_analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL,
  event_type ecd_analytics_event_type NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Add the foreign key only if ecd_centres exists and the constraint is missing
-- This avoids the "relation ecd_centres does not exist" error in isolated environments.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ecd_centres') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'ecd_analytics_events' AND constraint_name = 'ecd_analytics_events_ecd_id_fkey') THEN
      ALTER TABLE ecd_analytics_events ADD CONSTRAINT ecd_analytics_events_ecd_id_fkey FOREIGN KEY (ecd_id) REFERENCES ecd_centres(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 5. Add columns from migration 006 if they are missing (for safety)
ALTER TABLE ecd_analytics_events ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;
ALTER TABLE ecd_analytics_events ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- 6. Add the new Phase 4 analytics columns
ALTER TABLE ecd_analytics_events ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE ecd_analytics_events ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE ecd_analytics_events ADD COLUMN IF NOT EXISTS duration_ms integer;
ALTER TABLE ecd_analytics_events ADD COLUMN IF NOT EXISTS session_id text;

-- 7. Ensure RLS is active
ALTER TABLE ecd_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_analytics_events FORCE ROW LEVEL SECURITY;
