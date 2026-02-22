-- Security hardening pass:
-- 1) Add enrolled status
-- 2) Ensure RLS is enabled/forced on core tables
-- 3) Replace broad FOR ALL write policies with explicit SELECT/INSERT/UPDATE/DELETE
-- 4) Standardize tenant checks via get_user_ecd_ids()
-- 5) Add safe provisioning function used by auth trigger

DO $$
BEGIN
  ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'enrolled';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION can_access_ecd(target_ecd_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT target_ecd_id IN (SELECT get_user_ecd_ids());
$$;

CREATE OR REPLACE FUNCTION public.provision_user_profile(
  p_user_id UUID,
  p_role TEXT DEFAULT 'parent_user',
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_create_parent BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role :=
    CASE
      WHEN p_role IN ('platform_admin', 'ecd_admin', 'ecd_staff', 'parent_user')
        THEN p_role::user_role
      ELSE 'parent_user'::user_role
    END;

  INSERT INTO public.user_profiles (id, role, full_name, phone)
  VALUES (
    p_user_id,
    v_role,
    COALESCE(NULLIF(p_full_name, ''), 'New User'),
    NULLIF(p_phone, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = EXCLUDED.role,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone);

  IF p_create_parent AND v_role = 'parent_user' THEN
    INSERT INTO public.parents (id)
    VALUES (p_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.provision_user_profile(
    NEW.id,
    NEW.raw_user_meta_data ->> 'role',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    TRUE
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE ecd_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_centres FORCE ROW LEVEL SECURITY;
ALTER TABLE ecd_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_admins FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents FORCE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE children FORCE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications FORCE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE ecd_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_media FORCE ROW LEVEL SECURITY;
ALTER TABLE ecd_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_content FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements FORCE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecd_admins_select_strict" ON ecd_admins;
DROP POLICY IF EXISTS "ecd_admins_write_platform_only" ON ecd_admins;
CREATE POLICY "ecd_admins_select_strict" ON ecd_admins
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR ecd_id IN (SELECT get_user_ecd_ids())
  );
CREATE POLICY "ecd_admins_insert_platform_only" ON ecd_admins
  FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY "ecd_admins_update_platform_only" ON ecd_admins
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
CREATE POLICY "ecd_admins_delete_platform_only" ON ecd_admins
  FOR DELETE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "subscriptions_select_strict" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_write_platform_only" ON subscriptions;
CREATE POLICY "subscriptions_select_strict" ON subscriptions
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "subscriptions_insert_platform_only" ON subscriptions
  FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY "subscriptions_update_platform_only" ON subscriptions
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
CREATE POLICY "subscriptions_delete_platform_only" ON subscriptions
  FOR DELETE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "invoices_select_strict" ON invoices;
DROP POLICY IF EXISTS "invoices_write_platform_only" ON invoices;
CREATE POLICY "invoices_select_strict" ON invoices
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "invoices_insert_platform_only" ON invoices
  FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY "invoices_update_platform_only" ON invoices
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
CREATE POLICY "invoices_delete_platform_only" ON invoices
  FOR DELETE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "applications_select_strict" ON applications;
DROP POLICY IF EXISTS "applications_insert_parent_strict" ON applications;
DROP POLICY IF EXISTS "applications_update_strict" ON applications;
DROP POLICY IF EXISTS "applications_delete_strict" ON applications;
CREATE POLICY "applications_select_strict" ON applications
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR ecd_id IN (SELECT get_user_ecd_ids())
  );
CREATE POLICY "applications_insert_parent_strict" ON applications
  FOR INSERT
  WITH CHECK (
    (
      parent_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM children c
        WHERE c.id = applications.child_id
          AND c.parent_id = auth.uid()
      )
    )
    OR is_platform_admin()
  );
CREATE POLICY "applications_update_strict" ON applications
  FOR UPDATE
  USING (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR ecd_id IN (SELECT get_user_ecd_ids())
  )
  WITH CHECK (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR ecd_id IN (SELECT get_user_ecd_ids())
  );
CREATE POLICY "applications_delete_strict" ON applications
  FOR DELETE
  USING (parent_id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS "app_history_select_strict" ON application_status_history;
DROP POLICY IF EXISTS "app_history_insert_strict" ON application_status_history;
DROP POLICY IF EXISTS "app_history_delete_platform_only" ON application_status_history;
CREATE POLICY "app_history_select_strict" ON application_status_history
  FOR SELECT
  USING (
    is_platform_admin()
    OR ecd_id IN (SELECT get_user_ecd_ids())
    OR EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_status_history.application_id
        AND a.parent_id = auth.uid()
    )
  );
CREATE POLICY "app_history_insert_strict" ON application_status_history
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR ecd_id IN (SELECT get_user_ecd_ids())
  );
CREATE POLICY "app_history_update_platform_only" ON application_status_history
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
CREATE POLICY "app_history_delete_platform_only" ON application_status_history
  FOR DELETE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "ecd_media_select_strict" ON ecd_media;
DROP POLICY IF EXISTS "ecd_media_write_strict" ON ecd_media;
CREATE POLICY "ecd_media_select_strict" ON ecd_media
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "ecd_media_insert_strict" ON ecd_media
  FOR INSERT
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "ecd_media_update_strict" ON ecd_media
  FOR UPDATE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()))
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "ecd_media_delete_strict" ON ecd_media
  FOR DELETE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));

DROP POLICY IF EXISTS "ecd_content_select_strict" ON ecd_content;
DROP POLICY IF EXISTS "ecd_content_write_strict" ON ecd_content;
CREATE POLICY "ecd_content_select_strict" ON ecd_content
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "ecd_content_insert_strict" ON ecd_content
  FOR INSERT
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "ecd_content_update_strict" ON ecd_content
  FOR UPDATE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()))
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "ecd_content_delete_strict" ON ecd_content
  FOR DELETE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));

DROP POLICY IF EXISTS "calendar_events_select_strict" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_write_strict" ON calendar_events;
CREATE POLICY "calendar_events_select_strict" ON calendar_events
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "calendar_events_insert_strict" ON calendar_events
  FOR INSERT
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "calendar_events_update_strict" ON calendar_events
  FOR UPDATE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()))
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "calendar_events_delete_strict" ON calendar_events
  FOR DELETE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));

DROP POLICY IF EXISTS "announcements_select_strict" ON announcements;
DROP POLICY IF EXISTS "announcements_write_strict" ON announcements;
CREATE POLICY "announcements_select_strict" ON announcements
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "announcements_insert_strict" ON announcements
  FOR INSERT
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "announcements_update_strict" ON announcements
  FOR UPDATE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()))
  WITH CHECK (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "announcements_delete_strict" ON announcements
  FOR DELETE
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));

DROP POLICY IF EXISTS "support_tickets_select_strict" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_strict" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_strict" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_platform_only" ON support_tickets;
CREATE POLICY "support_tickets_select_strict" ON support_tickets
  FOR SELECT
  USING (
    is_platform_admin()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
  );
CREATE POLICY "support_tickets_insert_strict" ON support_tickets
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR created_by = auth.uid()
    OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
  );
CREATE POLICY "support_tickets_update_strict" ON support_tickets
  FOR UPDATE
  USING (
    is_platform_admin()
    OR assigned_to = auth.uid()
    OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
  )
  WITH CHECK (
    is_platform_admin()
    OR assigned_to = auth.uid()
    OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
  );
CREATE POLICY "support_tickets_delete_platform_only" ON support_tickets
  FOR DELETE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "support_messages_select_strict" ON support_ticket_messages;
DROP POLICY IF EXISTS "support_messages_insert_strict" ON support_ticket_messages;
DROP POLICY IF EXISTS "support_messages_delete_platform_only" ON support_ticket_messages;
CREATE POLICY "support_messages_select_strict" ON support_ticket_messages
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
    OR EXISTS (
      SELECT 1
      FROM support_tickets st
      WHERE st.id = support_ticket_messages.ticket_id
        AND st.created_by = auth.uid()
    )
  );
CREATE POLICY "support_messages_insert_strict" ON support_ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      is_platform_admin()
      OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
      OR EXISTS (
        SELECT 1
        FROM support_tickets st
        WHERE st.id = support_ticket_messages.ticket_id
          AND st.created_by = auth.uid()
      )
    )
  );
CREATE POLICY "support_messages_update_platform_only" ON support_ticket_messages
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
CREATE POLICY "support_messages_delete_platform_only" ON support_ticket_messages
  FOR DELETE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "audit_logs_select_strict" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_strict" ON audit_logs;
CREATE POLICY "audit_logs_select_strict" ON audit_logs
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
  );
CREATE POLICY "audit_logs_insert_strict" ON audit_logs
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (ecd_id IS NOT NULL AND ecd_id IN (SELECT get_user_ecd_ids()))
  );
CREATE POLICY "audit_logs_update_platform_only" ON audit_logs
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
CREATE POLICY "audit_logs_delete_platform_only" ON audit_logs
  FOR DELETE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "invitations_select_strict" ON ecd_admin_invitations;
DROP POLICY IF EXISTS "invitations_write_platform_only" ON ecd_admin_invitations;
CREATE POLICY "invitations_select_strict" ON ecd_admin_invitations
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "invitations_insert_platform_only" ON ecd_admin_invitations
  FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY "invitations_update_platform_only" ON ecd_admin_invitations
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
CREATE POLICY "invitations_delete_platform_only" ON ecd_admin_invitations
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
  SET status = 'enrolled',
      offer_accepted_at = v_now,
      decided_at = COALESCE(decided_at, v_now),
      updated_at = v_now
  WHERE id = v_app.id;

  INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, notes, ecd_id)
  VALUES (
    v_app.id,
    'approved'::application_status,
    'enrolled'::application_status,
    auth.uid(),
    'Parent accepted offer and enrollment finalized',
    v_app.ecd_id
  );

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
