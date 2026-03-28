-- Migration: add onboarding_completed_at to ecd_centres
-- Stamped when the owner completes the /ecd/onboarding wizard.
-- Used to gate first-week dashboard experiences and email timing.

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ecd_centres_onboarding_completed_at
  ON public.ecd_centres(onboarding_completed_at)
  WHERE onboarding_completed_at IS NOT NULL;

COMMENT ON COLUMN public.ecd_centres.onboarding_completed_at IS
  'Set when the owner completes the /ecd/onboarding wizard. Used to gate first-week dashboard experiences and email timing.';
