-- Public jobs application extra fields for launch.

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS id_number TEXT,
  ADD COLUMN IF NOT EXISTS "references" TEXT,
  ADD COLUMN IF NOT EXISTS centreconnect_email TEXT;

CREATE INDEX IF NOT EXISTS idx_job_applications_job_email
  ON public.job_applications(job_id, applicant_email);

