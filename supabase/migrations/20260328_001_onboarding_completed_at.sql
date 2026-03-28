-- Add onboarding_completed_at timestamp to ecd_centres.
-- Set when the owner completes the /ecd/onboarding wizard.
-- Used to gate first-week dashboard experiences (context strip, discovery cards)
-- and anchor Day 14 email timing off completion, not account creation.

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ecd_centres_onboarding_completed_at
  ON public.ecd_centres(onboarding_completed_at)
  WHERE onboarding_completed_at IS NOT NULL;

COMMENT ON COLUMN public.ecd_centres.onboarding_completed_at IS
  'Timestamp when the owner completed the /ecd/onboarding wizard. NULL for centres that completed onboarding before this column was added.';
