-- Offer lifecycle fields + explicit parent acceptance flow with auto-withdraw.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS offer_made_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdraw_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_withdraw_reason_chk'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_withdraw_reason_chk
      CHECK (
        withdraw_reason IS NULL
        OR withdraw_reason IN ('auto_after_accept', 'parent_manual', 'centre_closed')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ecd_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecd_notifications_ecd_time
  ON ecd_notifications(ecd_id, created_at DESC);

ALTER TABLE ecd_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecd_notifications_select_strict" ON ecd_notifications;
DROP POLICY IF EXISTS "ecd_notifications_insert_strict" ON ecd_notifications;
DROP POLICY IF EXISTS "ecd_notifications_update_strict" ON ecd_notifications;
DROP POLICY IF EXISTS "ecd_notifications_delete_platform_only" ON ecd_notifications;

CREATE POLICY "ecd_notifications_select_strict" ON ecd_notifications
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "ecd_notifications_insert_strict" ON ecd_notifications
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "ecd_notifications_update_strict" ON ecd_notifications
  FOR UPDATE
  USING (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  )
  WITH CHECK (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "ecd_notifications_delete_platform_only" ON ecd_notifications
  FOR DELETE
  USING (is_platform_admin());

CREATE OR REPLACE FUNCTION parent_accept_offer(p_application_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_app RECORD;
BEGIN
  SELECT id, parent_id, child_id, ecd_id, status, offer_accepted_at
  INTO v_app
  FROM applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_app.status <> 'approved' THEN
    RAISE EXCEPTION 'Offer is not available for acceptance';
  END IF;

  IF v_app.offer_accepted_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE applications
  SET offer_accepted_at = v_now,
      updated_at = v_now
  WHERE id = v_app.id;

  INSERT INTO ecd_notifications (ecd_id, application_id, title, message, metadata)
  VALUES (
    v_app.ecd_id,
    v_app.id,
    'Offer accepted',
    'A parent accepted your offer.',
    jsonb_build_object('kind', 'offer_accepted')
  );

  WITH targets AS (
    SELECT id, ecd_id, status
    FROM applications
    WHERE parent_id = v_app.parent_id
      AND child_id = v_app.child_id
      AND id <> v_app.id
      AND status IN ('submitted', 'in_review', 'waitlisted')
    FOR UPDATE
  ),
  withdrawn AS (
    UPDATE applications a
    SET status = 'withdrawn',
        withdrawn_at = v_now,
        withdraw_reason = 'auto_after_accept',
        reviewed_at = COALESCE(a.reviewed_at, v_now),
        decided_at = v_now,
        updated_at = v_now
    FROM targets t
    WHERE a.id = t.id
    RETURNING a.id, a.ecd_id, t.status AS old_status
  )
  INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, notes, ecd_id)
  SELECT
    w.id,
    w.old_status::application_status,
    'withdrawn'::application_status,
    auth.uid(),
    'Auto-withdrawn after parent accepted an offer',
    w.ecd_id
  FROM withdrawn w;

  INSERT INTO ecd_notifications (ecd_id, application_id, title, message, metadata)
  SELECT
    a.ecd_id,
    a.id,
    'Application withdrawn',
    'An application was withdrawn by the parent.',
    jsonb_build_object('kind', 'application_withdrawn')
  FROM applications a
  WHERE a.parent_id = v_app.parent_id
    AND a.child_id = v_app.child_id
    AND a.id <> v_app.id
    AND a.status = 'withdrawn'
    AND a.withdraw_reason = 'auto_after_accept'
    AND a.withdrawn_at = v_now;
END;
$$;

CREATE OR REPLACE FUNCTION parent_decline_offer(p_application_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_app RECORD;
BEGIN
  SELECT id, parent_id, ecd_id, status, offer_accepted_at
  INTO v_app
  FROM applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_app.status <> 'approved' THEN
    RAISE EXCEPTION 'Offer is not available for decline';
  END IF;

  IF v_app.offer_accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Accepted offer cannot be declined';
  END IF;

  UPDATE applications
  SET status = 'waitlisted',
      reviewed_at = COALESCE(reviewed_at, v_now),
      updated_at = v_now
  WHERE id = v_app.id;

  INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, notes, ecd_id)
  VALUES (
    v_app.id,
    'approved',
    'waitlisted',
    auth.uid(),
    'Parent declined offer',
    v_app.ecd_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION parent_accept_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION parent_decline_offer(UUID) TO authenticated;

