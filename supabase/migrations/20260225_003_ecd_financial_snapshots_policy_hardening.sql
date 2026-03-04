BEGIN;

DROP POLICY IF EXISTS "ecd_financial_snapshots_staff_read" ON public.ecd_financial_snapshots;

CREATE POLICY "ecd_financial_snapshots_supervisor_read"
  ON public.ecd_financial_snapshots
  FOR SELECT
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_supervisor')
  );

COMMIT;

