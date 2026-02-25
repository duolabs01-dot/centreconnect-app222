BEGIN;

-- Line-item detail for each monthly snapshot
CREATE TABLE IF NOT EXISTS public.ecd_financial_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense', 'asset', 'liability')),
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecd_fin_items_ecd_period
  ON public.ecd_financial_line_items(ecd_id, period_month DESC);

ALTER TABLE public.ecd_financial_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecd_financial_line_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fin_items_admin_manage" ON public.ecd_financial_line_items;
DROP POLICY IF EXISTS "fin_items_staff_read" ON public.ecd_financial_line_items;

CREATE POLICY "fin_items_admin_manage"
  ON public.ecd_financial_line_items
  FOR ALL
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  )
  WITH CHECK (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  );

-- Staff can read (view-only access)
CREATE POLICY "fin_items_staff_read"
  ON public.ecd_financial_line_items
  FOR SELECT
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() = 'ecd_staff'
  );

COMMIT;
