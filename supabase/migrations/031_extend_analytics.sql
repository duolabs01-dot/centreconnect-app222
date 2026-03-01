-- supabase/migrations/031_extend_analytics.sql
-- Extend analytics events with actor role, path, and duration.

-- 1. Add new event type to the enum
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'daily_report_published';

-- 2. Add new columns to the table (using IF NOT EXISTS for safety)
ALTER TABLE public.ecd_analytics_events
ADD COLUMN IF NOT EXISTS actor_role TEXT,
ADD COLUMN IF NOT EXISTS path TEXT,
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
