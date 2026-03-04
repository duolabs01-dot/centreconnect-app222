ALTER TABLE public.ecd_centres
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.ecd_centres.onboarding_complete IS
  'True after the centre completes the post-registration onboarding wizard.';
