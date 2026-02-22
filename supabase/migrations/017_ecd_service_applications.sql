CREATE TABLE IF NOT EXISTS public.ecd_service_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  applicant_email TEXT NOT NULL,
  applicant_full_name TEXT NOT NULL,
  applicant_phone TEXT,
  centre_name TEXT NOT NULL,
  centre_phone TEXT,
  centre_address TEXT,
  centre_suburb TEXT,
  centre_city TEXT NOT NULL DEFAULT 'Johannesburg',
  centre_province TEXT NOT NULL DEFAULT 'Gauteng',
  monthly_budget NUMERIC(10,2),
  expected_children INTEGER,
  selected_tier subscription_tier NOT NULL DEFAULT 'basic',
  recommended_tier subscription_tier NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'pending_review',
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  provisioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ecd_service_applications_status_check CHECK (
    status IN ('pending_review', 'approved', 'rejected', 'provisioned')
  )
);

CREATE INDEX IF NOT EXISTS idx_ecd_service_applications_email ON public.ecd_service_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_ecd_service_applications_status ON public.ecd_service_applications(status);
CREATE INDEX IF NOT EXISTS idx_ecd_service_applications_created ON public.ecd_service_applications(created_at DESC);

DROP TRIGGER IF EXISTS update_ecd_service_applications_updated_at ON public.ecd_service_applications;
CREATE TRIGGER update_ecd_service_applications_updated_at
  BEFORE UPDATE ON public.ecd_service_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.ecd_service_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecd_service_applications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecd_service_applications_select_own" ON public.ecd_service_applications;
DROP POLICY IF EXISTS "ecd_service_applications_insert_own" ON public.ecd_service_applications;
DROP POLICY IF EXISTS "ecd_service_applications_update_platform_only" ON public.ecd_service_applications;
DROP POLICY IF EXISTS "ecd_service_applications_delete_platform_only" ON public.ecd_service_applications;

CREATE POLICY "ecd_service_applications_select_own" ON public.ecd_service_applications
  FOR SELECT USING (user_id = auth.uid() OR lower(applicant_email) = lower(auth.email()));

CREATE POLICY "ecd_service_applications_insert_own" ON public.ecd_service_applications
  FOR INSERT WITH CHECK (user_id = auth.uid() OR lower(applicant_email) = lower(auth.email()));

CREATE POLICY "ecd_service_applications_update_platform_only" ON public.ecd_service_applications
  FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "ecd_service_applications_delete_platform_only" ON public.ecd_service_applications
  FOR DELETE USING (is_platform_admin());

