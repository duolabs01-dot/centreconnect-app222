BEGIN;

DROP POLICY IF EXISTS "driver_token_self_read" ON public.transport_drivers;
DROP POLICY IF EXISTS "ecd_staff_read_drivers" ON public.transport_drivers;

CREATE POLICY "ecd_team_read_drivers" ON public.transport_drivers
  FOR SELECT USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_staff', 'ecd_supervisor')
  );

COMMIT;
