-- Ensure required communication templates and per-application notification links.

ALTER TABLE parent_notifications
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parent_notifications_application
  ON parent_notifications(application_id, created_at DESC);

-- Normalize template keys to requested parent communication set.
UPDATE communication_templates
SET template_key = 'open_day_invite',
    title = 'Open Day Invite',
    body = 'Hi {{parent_name}}, {{centre_name}} is hosting an Open Day. We would love to meet you and {{child_name}}. Reply to confirm your slot.',
    is_active = TRUE
WHERE template_key = 'open_day';

UPDATE communication_templates
SET template_key = 'spot_available',
    title = 'Spot Available',
    body = 'Great news {{parent_name}}. A spot is now available for {{child_name}} at {{centre_name}}. Please confirm to secure it.',
    is_active = TRUE
WHERE template_key = 'spots_available';

UPDATE communication_templates
SET title = 'Missing Documents',
    body = 'Hi {{parent_name}}, please upload the missing documents for {{child_name}} (application {{application_number}}) at {{centre_name}}.'
WHERE template_key = 'missing_documents';

UPDATE communication_templates
SET is_active = FALSE
WHERE template_key = 'fees_reminder';

INSERT INTO communication_templates (template_key, title, body, is_active)
VALUES (
  'application_update',
  'Application Update',
  'Hi {{parent_name}}, your application {{application_number}} for {{child_name}} at {{centre_name}} is now {{status}}.',
  TRUE
)
ON CONFLICT (template_key) DO UPDATE
SET title = EXCLUDED.title,
    body = EXCLUDED.body,
    is_active = EXCLUDED.is_active;

INSERT INTO communication_templates (template_key, title, body, is_active)
VALUES (
  'open_day_invite',
  'Open Day Invite',
  'Hi {{parent_name}}, {{centre_name}} is hosting an Open Day. We would love to meet you and {{child_name}}. Reply to confirm your slot.',
  TRUE
)
ON CONFLICT (template_key) DO UPDATE
SET title = EXCLUDED.title,
    body = EXCLUDED.body,
    is_active = EXCLUDED.is_active;

INSERT INTO communication_templates (template_key, title, body, is_active)
VALUES (
  'spot_available',
  'Spot Available',
  'Great news {{parent_name}}. A spot is now available for {{child_name}} at {{centre_name}}. Please confirm to secure it.',
  TRUE
)
ON CONFLICT (template_key) DO UPDATE
SET title = EXCLUDED.title,
    body = EXCLUDED.body,
    is_active = EXCLUDED.is_active;

