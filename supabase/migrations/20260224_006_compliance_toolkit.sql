BEGIN;

CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  label TEXT NOT NULL,
  file_url TEXT,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'uploaded', 'verified', 'expired')),
  notes TEXT,
  uploaded_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compliance_staff_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_role TEXT,
  medical_clearance_date DATE,
  criminal_clearance_date DATE,
  first_aid_cert_date DATE,
  first_aid_cert_expires DATE,
  form_29_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_ecd_id
  ON public.compliance_documents(ecd_id);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_status
  ON public.compliance_documents(status);

CREATE INDEX IF NOT EXISTS idx_compliance_staff_checks_ecd_id
  ON public.compliance_staff_checks(ecd_id);

ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_staff_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_documents_admin_supervisor_all" ON public.compliance_documents;
DROP POLICY IF EXISTS "compliance_documents_staff_select" ON public.compliance_documents;

CREATE POLICY "compliance_documents_admin_supervisor_all"
  ON public.compliance_documents
  FOR ALL
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  )
  WITH CHECK (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  );

CREATE POLICY "compliance_documents_staff_select"
  ON public.compliance_documents
  FOR SELECT
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() = 'ecd_staff'
  );

DROP POLICY IF EXISTS "compliance_staff_checks_admin_supervisor_all" ON public.compliance_staff_checks;
DROP POLICY IF EXISTS "compliance_staff_checks_staff_select" ON public.compliance_staff_checks;

CREATE POLICY "compliance_staff_checks_admin_supervisor_all"
  ON public.compliance_staff_checks
  FOR ALL
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  )
  WITH CHECK (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  );

CREATE POLICY "compliance_staff_checks_staff_select"
  ON public.compliance_staff_checks
  FOR SELECT
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() = 'ecd_staff'
  );

COMMIT;

