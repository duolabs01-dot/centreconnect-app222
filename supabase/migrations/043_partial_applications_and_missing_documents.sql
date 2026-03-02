-- Partial applications support + missing document tracking

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'partial';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS missing_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_missing_documents_is_array;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_missing_documents_is_array
  CHECK (jsonb_typeof(missing_documents) = 'array');

CREATE INDEX IF NOT EXISTS idx_applications_missing_documents_gin
  ON public.applications
  USING GIN (missing_documents);

