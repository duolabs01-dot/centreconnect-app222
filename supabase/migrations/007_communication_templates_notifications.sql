-- Communication templates and parent notifications inbox.

CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  template_key TEXT REFERENCES communication_templates(template_key) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_notifications_parent_time
  ON parent_notifications(parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parent_notifications_ecd_time
  ON parent_notifications(ecd_id, created_at DESC);

INSERT INTO communication_templates (template_key, title, body, is_active)
VALUES
  (
    'open_day',
    'Open Day Invitation',
    'Hi parent, we are hosting an Open Day this week at {{centre_name}}. Reply if you want to book a slot.',
    TRUE
  ),
  (
    'fees_reminder',
    'Fees Reminder',
    'Hi parent, this is a reminder about your upcoming fee due date at {{centre_name}}.',
    TRUE
  ),
  (
    'missing_documents',
    'Missing Documents',
    'Hi parent, please submit the outstanding documents for your child application at {{centre_name}}.',
    TRUE
  ),
  (
    'spots_available',
    'Spots Available',
    'Good news. We have spots available at {{centre_name}}. Please confirm if you want to proceed.',
    TRUE
  )
ON CONFLICT (template_key) DO NOTHING;

ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates FORCE ROW LEVEL SECURITY;

ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communication_templates_select_authenticated" ON communication_templates;
DROP POLICY IF EXISTS "communication_templates_write_platform_only" ON communication_templates;
DROP POLICY IF EXISTS "parent_notifications_select_strict" ON parent_notifications;
DROP POLICY IF EXISTS "parent_notifications_insert_strict" ON parent_notifications;
DROP POLICY IF EXISTS "parent_notifications_update_strict" ON parent_notifications;
DROP POLICY IF EXISTS "parent_notifications_delete_platform_only" ON parent_notifications;

CREATE POLICY "communication_templates_select_authenticated" ON communication_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "communication_templates_write_platform_only" ON communication_templates
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "parent_notifications_select_strict" ON parent_notifications
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR user_is_ecd_admin(ecd_id)
    OR is_platform_admin()
  );

CREATE POLICY "parent_notifications_insert_strict" ON parent_notifications
  FOR INSERT
  WITH CHECK (
    user_is_ecd_admin(ecd_id)
    OR is_platform_admin()
  );

CREATE POLICY "parent_notifications_update_strict" ON parent_notifications
  FOR UPDATE
  USING (
    parent_id = auth.uid()
    OR user_is_ecd_admin(ecd_id)
    OR is_platform_admin()
  )
  WITH CHECK (
    parent_id = auth.uid()
    OR user_is_ecd_admin(ecd_id)
    OR is_platform_admin()
  );

CREATE POLICY "parent_notifications_delete_platform_only" ON parent_notifications
  FOR DELETE
  USING (is_platform_admin());
