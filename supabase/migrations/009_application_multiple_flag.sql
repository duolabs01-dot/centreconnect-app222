-- Privacy-safe multiple-application indicator.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS applied_multiple BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_multiple_flag BOOLEAN NOT NULL DEFAULT TRUE;

-- Ensure updated_at exists and is maintained for applications.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION set_applied_multiple_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER := 0;
BEGIN
  -- Only active statuses count toward the multiple-centre indicator.
  IF NEW.status IN ('submitted', 'in_review', 'waitlisted') THEN
    SELECT COUNT(*) INTO active_count
    FROM applications a
    WHERE a.child_id = NEW.child_id
      AND a.status IN ('submitted', 'in_review', 'waitlisted');

    IF active_count >= 2 THEN
      UPDATE applications
      SET applied_multiple = TRUE
      WHERE child_id = NEW.child_id
        AND status IN ('submitted', 'in_review', 'waitlisted');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_set_applied_multiple_on_insert ON applications;

CREATE TRIGGER applications_set_applied_multiple_on_insert
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION set_applied_multiple_on_insert();

-- Reassert strict tenant isolation on application reads/writes for ECD admins.
DROP POLICY IF EXISTS "applications_select_strict" ON applications;
DROP POLICY IF EXISTS "applications_update_strict" ON applications;

CREATE POLICY "applications_select_strict" ON applications
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "applications_update_strict" ON applications
  FOR UPDATE
  USING (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  )
  WITH CHECK (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );
