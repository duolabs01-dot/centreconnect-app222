-- CentreConnect RLS hardening + multi-tenant isolation
-- This migration tightens tenant and parent boundaries and introduces
-- an internal invitation table for platform-admin onboarding workflows.

-- -------------------------------------------------------------------
-- Schema hardening for tenant-owned tables
-- -------------------------------------------------------------------
ALTER TABLE application_status_history
  ADD COLUMN IF NOT EXISTS ecd_id UUID REFERENCES ecd_centres(id) ON DELETE CASCADE;

UPDATE application_status_history ash
SET ecd_id = a.ecd_id
FROM applications a
WHERE ash.application_id = a.id
  AND ash.ecd_id IS NULL;

ALTER TABLE application_status_history
  ALTER COLUMN ecd_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_history_ecd ON application_status_history(ecd_id);

ALTER TABLE support_ticket_messages
  ADD COLUMN IF NOT EXISTS ecd_id UUID REFERENCES ecd_centres(id) ON DELETE CASCADE;

UPDATE support_ticket_messages stm
SET ecd_id = st.ecd_id
FROM support_tickets st
WHERE stm.ticket_id = st.id
  AND stm.ecd_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ecd ON support_ticket_messages(ecd_id);

CREATE TABLE IF NOT EXISTS ecd_admin_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL CHECK (role IN ('ecd_admin', 'ecd_staff')),
  invited_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (ecd_id, email)
);

CREATE INDEX IF NOT EXISTS idx_ecd_admin_invitations_ecd ON ecd_admin_invitations(ecd_id);
CREATE INDEX IF NOT EXISTS idx_ecd_admin_invitations_email ON ecd_admin_invitations(email);

-- -------------------------------------------------------------------
-- Helper functions
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'platform_admin'
  );
$$;

CREATE OR REPLACE FUNCTION user_is_ecd_admin(target_ecd_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ecd_admins ea
    WHERE ea.user_id = auth.uid()
      AND ea.ecd_id = target_ecd_id
  );
$$;



-- -------------------------------------------------------------------
-- Enable + force RLS
-- -------------------------------------------------------------------
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

ALTER TABLE ecd_admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_admin_invitations FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------
-- Drop permissive legacy policies (from 001)
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Public read active centres" ON ecd_centres;
DROP POLICY IF EXISTS "ECD admins read own centres" ON ecd_centres;
DROP POLICY IF EXISTS "Platform admins full access centres" ON ecd_centres;

DROP POLICY IF EXISTS "Parents read own parent profile" ON parents;
DROP POLICY IF EXISTS "Parents create own parent profile" ON parents;
DROP POLICY IF EXISTS "Parents update own parent profile" ON parents;

DROP POLICY IF EXISTS "Parents manage own children" ON children;
DROP POLICY IF EXISTS "Parents view own applications" ON applications;
DROP POLICY IF EXISTS "Parents create applications" ON applications;
DROP POLICY IF EXISTS "ECD admins manage centre applications" ON applications;

-- -------------------------------------------------------------------
-- Strict policies
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_strict" ON user_profiles;
DROP POLICY IF EXISTS "profiles_insert_strict" ON user_profiles;
DROP POLICY IF EXISTS "profiles_update_strict" ON user_profiles;
DROP POLICY IF EXISTS "profiles_delete_platform_only" ON user_profiles;

DROP POLICY IF EXISTS "centres_select_strict" ON ecd_centres;
DROP POLICY IF EXISTS "centres_insert_platform_only" ON ecd_centres;
DROP POLICY IF EXISTS "centres_update_strict" ON ecd_centres;
DROP POLICY IF EXISTS "centres_delete_platform_only" ON ecd_centres;

DROP POLICY IF EXISTS "ecd_admins_select_strict" ON ecd_admins;
DROP POLICY IF EXISTS "ecd_admins_write_platform_only" ON ecd_admins;

DROP POLICY IF EXISTS "subscriptions_select_strict" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_write_platform_only" ON subscriptions;

DROP POLICY IF EXISTS "invoices_select_strict" ON invoices;
DROP POLICY IF EXISTS "invoices_write_platform_only" ON invoices;

DROP POLICY IF EXISTS "parents_select_strict" ON parents;
DROP POLICY IF EXISTS "parents_insert_strict" ON parents;
DROP POLICY IF EXISTS "parents_update_strict" ON parents;
DROP POLICY IF EXISTS "parents_delete_platform_only" ON parents;

DROP POLICY IF EXISTS "children_select_strict" ON children;
DROP POLICY IF EXISTS "children_insert_strict" ON children;
DROP POLICY IF EXISTS "children_update_strict" ON children;
DROP POLICY IF EXISTS "children_delete_strict" ON children;

DROP POLICY IF EXISTS "applications_select_strict" ON applications;
DROP POLICY IF EXISTS "applications_insert_parent_strict" ON applications;
DROP POLICY IF EXISTS "applications_update_strict" ON applications;
DROP POLICY IF EXISTS "applications_delete_strict" ON applications;

DROP POLICY IF EXISTS "app_history_select_strict" ON application_status_history;
DROP POLICY IF EXISTS "app_history_insert_strict" ON application_status_history;
DROP POLICY IF EXISTS "app_history_delete_platform_only" ON application_status_history;

DROP POLICY IF EXISTS "ecd_media_select_strict" ON ecd_media;
DROP POLICY IF EXISTS "ecd_media_write_strict" ON ecd_media;

DROP POLICY IF EXISTS "ecd_content_select_strict" ON ecd_content;
DROP POLICY IF EXISTS "ecd_content_write_strict" ON ecd_content;

DROP POLICY IF EXISTS "calendar_events_select_strict" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_write_strict" ON calendar_events;

DROP POLICY IF EXISTS "announcements_select_strict" ON announcements;
DROP POLICY IF EXISTS "announcements_write_strict" ON announcements;

DROP POLICY IF EXISTS "support_tickets_select_strict" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_strict" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_strict" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_platform_only" ON support_tickets;

DROP POLICY IF EXISTS "support_messages_select_strict" ON support_ticket_messages;
DROP POLICY IF EXISTS "support_messages_insert_strict" ON support_ticket_messages;
DROP POLICY IF EXISTS "support_messages_delete_platform_only" ON support_ticket_messages;

DROP POLICY IF EXISTS "audit_logs_select_strict" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_strict" ON audit_logs;

DROP POLICY IF EXISTS "invitations_select_strict" ON ecd_admin_invitations;
DROP POLICY IF EXISTS "invitations_write_platform_only" ON ecd_admin_invitations;

CREATE POLICY "profiles_select_strict" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id OR is_platform_admin());

CREATE POLICY "profiles_insert_strict" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR is_platform_admin());

CREATE POLICY "profiles_update_strict" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id OR is_platform_admin())
  WITH CHECK (auth.uid() = id OR is_platform_admin());

CREATE POLICY "profiles_delete_platform_only" ON user_profiles
  FOR DELETE
  USING (is_platform_admin());

CREATE POLICY "centres_select_strict" ON ecd_centres
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(id));

CREATE POLICY "centres_insert_platform_only" ON ecd_centres
  FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "centres_update_strict" ON ecd_centres
  FOR UPDATE
  USING (is_platform_admin() OR user_is_ecd_admin(id))
  WITH CHECK (is_platform_admin() OR user_is_ecd_admin(id));

CREATE POLICY "centres_delete_platform_only" ON ecd_centres
  FOR DELETE
  USING (is_platform_admin());

CREATE POLICY "ecd_admins_select_strict" ON ecd_admins
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "ecd_admins_write_platform_only" ON ecd_admins
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "subscriptions_select_strict" ON subscriptions
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "subscriptions_write_platform_only" ON subscriptions
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "invoices_select_strict" ON invoices
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "invoices_write_platform_only" ON invoices
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "parents_select_strict" ON parents
  FOR SELECT
  USING (id = auth.uid() OR is_platform_admin());

CREATE POLICY "parents_insert_strict" ON parents
  FOR INSERT
  WITH CHECK (id = auth.uid() OR is_platform_admin());

CREATE POLICY "parents_update_strict" ON parents
  FOR UPDATE
  USING (id = auth.uid() OR is_platform_admin())
  WITH CHECK (id = auth.uid() OR is_platform_admin());

CREATE POLICY "parents_delete_platform_only" ON parents
  FOR DELETE
  USING (is_platform_admin());

CREATE POLICY "children_select_strict" ON children
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.child_id = children.id
        AND user_is_ecd_admin(a.ecd_id)
    )
  );

CREATE POLICY "children_insert_strict" ON children
  FOR INSERT
  WITH CHECK (parent_id = auth.uid() OR is_platform_admin());

CREATE POLICY "children_update_strict" ON children
  FOR UPDATE
  USING (parent_id = auth.uid() OR is_platform_admin())
  WITH CHECK (parent_id = auth.uid() OR is_platform_admin());

CREATE POLICY "children_delete_strict" ON children
  FOR DELETE
  USING (parent_id = auth.uid() OR is_platform_admin());

CREATE POLICY "applications_select_strict" ON applications
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
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
    OR user_is_ecd_admin(ecd_id)
  )
  WITH CHECK (
    parent_id = auth.uid()
    OR is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "applications_delete_strict" ON applications
  FOR DELETE
  USING (parent_id = auth.uid() OR is_platform_admin());

CREATE POLICY "app_history_select_strict" ON application_status_history
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
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
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "app_history_delete_platform_only" ON application_status_history
  FOR DELETE
  USING (is_platform_admin());

CREATE POLICY "ecd_media_select_strict" ON ecd_media
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "ecd_media_write_strict" ON ecd_media
  FOR ALL
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id))
  WITH CHECK (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "ecd_content_select_strict" ON ecd_content
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "ecd_content_write_strict" ON ecd_content
  FOR ALL
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id))
  WITH CHECK (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "calendar_events_select_strict" ON calendar_events
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "calendar_events_write_strict" ON calendar_events
  FOR ALL
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id))
  WITH CHECK (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "announcements_select_strict" ON announcements
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "announcements_write_strict" ON announcements
  FOR ALL
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id))
  WITH CHECK (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "support_tickets_select_strict" ON support_tickets
  FOR SELECT
  USING (
    is_platform_admin()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
  );

CREATE POLICY "support_tickets_insert_strict" ON support_tickets
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR created_by = auth.uid()
    OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
  );

CREATE POLICY "support_tickets_update_strict" ON support_tickets
  FOR UPDATE
  USING (
    is_platform_admin()
    OR assigned_to = auth.uid()
    OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
  )
  WITH CHECK (
    is_platform_admin()
    OR assigned_to = auth.uid()
    OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
  );

CREATE POLICY "support_tickets_delete_platform_only" ON support_tickets
  FOR DELETE
  USING (is_platform_admin());

CREATE POLICY "support_messages_select_strict" ON support_ticket_messages
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
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
      OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
      OR EXISTS (
        SELECT 1
        FROM support_tickets st
        WHERE st.id = support_ticket_messages.ticket_id
          AND st.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "support_messages_delete_platform_only" ON support_ticket_messages
  FOR DELETE
  USING (is_platform_admin());

CREATE POLICY "audit_logs_select_strict" ON audit_logs
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
  );

CREATE POLICY "audit_logs_insert_strict" ON audit_logs
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (ecd_id IS NOT NULL AND user_is_ecd_admin(ecd_id))
  );

CREATE POLICY "invitations_select_strict" ON ecd_admin_invitations
  FOR SELECT
  USING (is_platform_admin() OR user_is_ecd_admin(ecd_id));

CREATE POLICY "invitations_write_platform_only" ON ecd_admin_invitations
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
