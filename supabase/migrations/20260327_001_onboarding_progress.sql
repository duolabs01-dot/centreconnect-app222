-- Migration: 20260327_001_onboarding_progress
-- Adds onboarding_progress JSONB column to ecd_centres.
--
-- Stores a map of { step_key: ISO timestamp } recording when each
-- onboarding step was first completed. Used by the dashboard checklist
-- and the cron drip job to track per-centre progress without re-querying
-- multiple tables on every page load.
--
-- Step keys (mirrors the dashboard checklist):
--   logo          – logo_url is set
--   cover         – cover_image_url is set
--   description   – description / bio is written
--   children      – first child added
--   attendance    – first attendance record
--   pickup        – first pickup code activated
--   published     – website_published = true OR is_active = true
--
-- The column is optional — existing centres start with NULL (treated as {}).
-- The application layer updates it via server actions as steps are completed.

ALTER TABLE ecd_centres
  ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}'::jsonb;

-- Index for fast queries on centres that have/haven't completed specific steps.
-- e.g. WHERE (onboarding_progress->>'children') IS NULL
CREATE INDEX IF NOT EXISTS idx_ecd_centres_onboarding_progress
  ON ecd_centres USING gin (onboarding_progress jsonb_path_ops);

-- RPC helper used by lib/actions/onboarding-progress.ts
-- Sets a step key only if not already present (preserves original timestamp).
CREATE OR REPLACE FUNCTION stamp_onboarding_step(
  p_ecd_id       UUID,
  p_step_key     TEXT,
  p_completed_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ecd_centres
  SET onboarding_progress = jsonb_set(
    COALESCE(onboarding_progress, '{}'::jsonb),
    ARRAY[p_step_key],
    to_jsonb(p_completed_at::text),
    true  -- create key if missing
  )
  WHERE id = p_ecd_id
    AND (onboarding_progress->p_step_key) IS NULL;
END;
$$;

-- Backfill: for centres that already have data, stamp the known completed steps.
-- This is a best-effort backfill using current state; timestamps will be NOW()
-- since we don\t have the original completion times.
UPDATE ecd_centres
SET onboarding_progress = jsonb_strip_nulls(jsonb_build_object(
  'logo',        CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN to_jsonb(now()::text) ELSE NULL END,
  'cover',       CASE WHEN cover_image_url IS NOT NULL AND cover_image_url != '' THEN to_jsonb(now()::text) ELSE NULL END,
  'description', CASE WHEN description IS NOT NULL AND description != '' THEN to_jsonb(now()::text) ELSE NULL END,
  'published',   CASE WHEN is_active = true THEN to_jsonb(now()::text) ELSE NULL END
))
WHERE is_deleted = false
  AND (onboarding_progress IS NULL OR onboarding_progress = '{}'::jsonb);
