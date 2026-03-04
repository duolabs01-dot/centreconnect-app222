-- Lightweight analytics events for ROI reporting.

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

CREATE TABLE IF NOT EXISTS ecd_analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  event_type ecd_analytics_event_type NOT NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecd_analytics_events_ecd_time
  ON ecd_analytics_events(ecd_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ecd_analytics_events_type_time
  ON ecd_analytics_events(event_type, created_at DESC);

ALTER TABLE ecd_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_analytics_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecd_analytics_events_select_strict" ON ecd_analytics_events;
DROP POLICY IF EXISTS "ecd_analytics_events_insert_platform_only" ON ecd_analytics_events;
DROP POLICY IF EXISTS "ecd_analytics_events_update_platform_only" ON ecd_analytics_events;
DROP POLICY IF EXISTS "ecd_analytics_events_delete_platform_only" ON ecd_analytics_events;

CREATE POLICY "ecd_analytics_events_select_strict" ON ecd_analytics_events
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "ecd_analytics_events_insert_platform_only" ON ecd_analytics_events
  FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "ecd_analytics_events_update_platform_only" ON ecd_analytics_events
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "ecd_analytics_events_delete_platform_only" ON ecd_analytics_events
  FOR DELETE
  USING (is_platform_admin());
