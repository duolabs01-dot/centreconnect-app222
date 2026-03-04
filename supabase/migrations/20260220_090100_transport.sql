BEGIN;

CREATE TABLE IF NOT EXISTS public.transport_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  UNIQUE (ecd_id),
  offers_transport BOOLEAN NOT NULL DEFAULT FALSE,
  fee_per_month INTEGER,
  fee_description TEXT,
  coverage_areas TEXT[],
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transport_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id),
  child_id UUID REFERENCES public.children(id),
  pickup_address TEXT NOT NULL,
  pickup_area TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','quoted','accepted','declined','referred')),
  quote_amount INTEGER,
  quote_notes TEXT,
  quoted_at TIMESTAMPTZ,
  referral_provider TEXT,
  referral_contact TEXT,
  referral_notes TEXT,
  referred_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transport_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "public_read_transport_config" ON public.transport_configs
  FOR SELECT
  USING (TRUE);

CREATE POLICY IF NOT EXISTS "ecd_admin_manage_transport_config" ON public.transport_configs
  FOR ALL
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() = 'ecd_admin'
  )
  WITH CHECK (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() = 'ecd_admin'
  );

CREATE POLICY IF NOT EXISTS "parent_own_transport_enquiries" ON public.transport_enquiries
  FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY IF NOT EXISTS "ecd_read_transport_enquiries" ON public.transport_enquiries
  FOR SELECT
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_staff')
  );

CREATE POLICY IF NOT EXISTS "ecd_update_transport_enquiries" ON public.transport_enquiries
  FOR UPDATE
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_staff')
  )
  WITH CHECK (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_staff')
  );

COMMIT;
