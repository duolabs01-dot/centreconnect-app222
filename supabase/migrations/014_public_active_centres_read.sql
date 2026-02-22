-- Allow public/parent read of active centre rows so directory and profile pages work.
-- Keep write access locked down to platform admins / centre admins via existing policies.

DROP POLICY IF EXISTS "centres_select_strict" ON ecd_centres;

CREATE POLICY "centres_select_strict" ON ecd_centres
  FOR SELECT
  USING (
    is_active = true
    OR is_platform_admin()
    OR id IN (SELECT get_user_ecd_ids())
  );
