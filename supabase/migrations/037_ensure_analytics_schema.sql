-- Migration: Ensure Phase 4 Analytics Schema
-- Description: Extends ecd_analytics_events with role segmentation, duration, and path tracking.

-- 1. Ensure the enum exists and has all values (idempotent)
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

-- Add new values if they don't exist
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'page_view';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'page_duration';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'pickup_verified';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'announcement_sent';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'compliance_uploaded';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'parent_invite_sent';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'invoice_paid';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'marketplace_requested';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'referral_used';

-- 2. Ensure the table has the required Phase 4 columns
ALTER TABLE public.ecd_analytics_events ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE public.ecd_analytics_events ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE public.ecd_analytics_events ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE public.ecd_analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.ecd_analytics_events ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL;
ALTER TABLE public.ecd_analytics_events ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 3. Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_path ON public.ecd_analytics_events(path);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.ecd_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_role ON public.ecd_analytics_events(actor_role);

-- 4. Ensure RLS is active and correct
ALTER TABLE public.ecd_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecd_analytics_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecd_analytics_events_select_strict" ON public.ecd_analytics_events;
CREATE POLICY "ecd_analytics_events_select_strict" ON public.ecd_analytics_events
  FOR SELECT
  USING (
    is_platform_admin() 
    OR user_is_ecd_admin(ecd_id)
  );

DROP POLICY IF EXISTS "ecd_analytics_events_insert_platform_only" ON public.ecd_analytics_events;
CREATE POLICY "ecd_analytics_events_insert_platform_only" ON public.ecd_analytics_events
  FOR INSERT
  WITH CHECK (is_platform_admin());
