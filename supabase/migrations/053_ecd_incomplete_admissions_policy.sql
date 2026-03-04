-- Let each centre choose whether incomplete applications can still be processed.
-- When true: staff can review/approve and request missing docs later.
-- When false: incomplete profiles must be completed before approval.

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS allow_incomplete_applications BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.ecd_centres.allow_incomplete_applications IS
  'If true, the centre may process/approve incomplete applications and request documents later.';

