BEGIN;

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS enrollment_start_date DATE;

COMMENT ON COLUMN public.children.enrollment_start_date IS
  'Requested or planned start date for child enrollment, set during manual onboarding or bulk import.';

CREATE INDEX IF NOT EXISTS idx_children_enrollment_start_date
  ON public.children (enrollment_start_date);

COMMIT;
