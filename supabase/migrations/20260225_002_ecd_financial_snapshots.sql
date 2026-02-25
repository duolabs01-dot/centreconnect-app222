BEGIN;

CREATE TABLE IF NOT EXISTS public.ecd_financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  revenue_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  assets_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  liabilities_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ecd_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_ecd_financial_snapshots_ecd_period
  ON public.ecd_financial_snapshots(ecd_id, period_month DESC);

ALTER TABLE public.ecd_financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecd_financial_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecd_financial_snapshots_admin_manage" ON public.ecd_financial_snapshots;
DROP POLICY IF EXISTS "ecd_financial_snapshots_staff_read" ON public.ecd_financial_snapshots;

CREATE POLICY "ecd_financial_snapshots_admin_manage"
  ON public.ecd_financial_snapshots
  FOR ALL
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  )
  WITH CHECK (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  );

CREATE POLICY "ecd_financial_snapshots_staff_read"
  ON public.ecd_financial_snapshots
  FOR SELECT
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor', 'ecd_staff')
  );

DROP TRIGGER IF EXISTS update_ecd_financial_snapshots_updated_at ON public.ecd_financial_snapshots;
CREATE TRIGGER update_ecd_financial_snapshots_updated_at
  BEFORE UPDATE ON public.ecd_financial_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMIT;
