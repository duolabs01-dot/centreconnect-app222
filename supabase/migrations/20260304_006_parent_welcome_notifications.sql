-- Allow system-level parent notifications (no centre) and seed onboarding templates.

ALTER TABLE public.parent_notifications
  ALTER COLUMN ecd_id DROP NOT NULL;

INSERT INTO public.communication_templates (template_key, title, body, is_active)
VALUES
  (
    'cc_welcome_intro',
    'Welcome to CentreConnect',
    'Hi {{parent_name}}, welcome aboard. CentreConnect helps families discover centres, track applications, and stay in sync with daily updates in one place.',
    TRUE
  ),
  (
    'cc_welcome_inbox_guide',
    'Your Notifications Live Here',
    'Open the bell in your top bar anytime, or go to /parent/notifications for your full inbox.',
    TRUE
  ),
  (
    'cc_welcome_legal',
    'Quick Legal and Terms Note',
    'By using CentreConnect, you agree to our Terms, Privacy Policy, and POPIA security commitments. You can review these under /terms, /privacy, and /popia-security.',
    TRUE
  ),
  (
    'cc_welcome_security',
    'Security, With Heart',
    'We use secure sessions, strict role-based access, and verified pickup workflows to protect your family data and child safety records.',
    TRUE
  )
ON CONFLICT (template_key) DO UPDATE
SET title = EXCLUDED.title,
    body = EXCLUDED.body,
    is_active = EXCLUDED.is_active;

