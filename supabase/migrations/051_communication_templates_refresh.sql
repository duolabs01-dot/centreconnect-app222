-- Refresh communication templates with simple, parent-friendly copy.
-- South African context, simple English, and clear calls to action.

INSERT INTO communication_templates (template_key, title, body, is_active)
VALUES
  (
    'application_update',
    'Application Update',
    'Hi {{parent_name}}, this is an update from {{centre_name}} about {{child_name}} ({{application_number}}). Status: {{status}}. Reply in the app if you need help.',
    TRUE
  ),
  (
    'missing_documents',
    'Missing Documents',
    'Hi {{parent_name}}, we are almost done with {{child_name}}''s application at {{centre_name}}. Please upload the missing documents for {{application_number}} so we can continue. Thank you.',
    TRUE
  ),
  (
    'open_day_invite',
    'Open Day Invite',
    'Hi {{parent_name}}, {{centre_name}} is hosting an Open Day this week. Bring {{child_name}} and come meet the team. Reply to book your spot.',
    TRUE
  ),
  (
    'spot_available',
    'Spot Available',
    'Good news {{parent_name}}. A place is now open for {{child_name}} at {{centre_name}}. Reply soon if you want us to reserve it.',
    TRUE
  ),
  (
    'welcome_message',
    'Welcome to the Creche',
    'Hi {{parent_name}}, welcome to {{centre_name}}. We are happy to support {{child_name}} and your family.',
    TRUE
  ),
  (
    'pickup_reminder',
    'Pickup Reminder',
    'Hi {{parent_name}}, friendly reminder from {{centre_name}}: please bring your pickup code when collecting {{child_name}} today.',
    TRUE
  ),
  (
    'payment_reminder',
    'Friendly Fee Reminder',
    'Hi {{parent_name}}, this is a friendly reminder from {{centre_name}} about your monthly fee. Please check Billing in the app if you need details.',
    TRUE
  ),
  (
    'report_card_ready',
    'Report Card Ready',
    'Hi {{parent_name}}, {{child_name}}''s report card is now ready from {{centre_name}}. Open the app to view progress and teacher notes.',
    TRUE
  ),
  (
    'holiday_notice',
    'Holiday Notice',
    'Hi {{parent_name}}, {{centre_name}} will be closed for a holiday period. Please check announcements for exact dates and reopening time.',
    TRUE
  ),
  (
    'health_notice',
    'Health Notice',
    'Hi {{parent_name}}, if {{child_name}} is unwell, please keep them at home and let {{centre_name}} know. Thank you for helping keep everyone safe.',
    TRUE
  ),
  (
    'parent_meeting_invite',
    'Parent Meeting Invite',
    'Hi {{parent_name}}, {{centre_name}} is inviting you to a short parent meeting about {{child_name}}''s progress. Please reply with a time that works for you.',
    TRUE
  ),
  (
    'profile_completion_nudge',
    'Complete Profile',
    'Hi {{parent_name}}, please complete your profile and documents for {{child_name}} on CentreConnect. It helps us process applications faster.',
    TRUE
  ),
  (
    'daily_report_nudge',
    'Daily Report Update',
    'Hi {{parent_name}}, {{centre_name}} has shared today''s update for {{child_name}}. Open the app to see meals, mood, and activities.',
    TRUE
  ),
  (
    'emergency_notice',
    'Urgent Notice',
    'Hi {{parent_name}}, this is an urgent update from {{centre_name}}. Please open the app now for details.',
    TRUE
  )
ON CONFLICT (template_key) DO UPDATE
SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  is_active = EXCLUDED.is_active;

-- Keep old legacy keys disabled to avoid duplicate confusing choices.
UPDATE communication_templates
SET is_active = FALSE
WHERE template_key IN ('open_day', 'spots_available', 'fees_reminder');

