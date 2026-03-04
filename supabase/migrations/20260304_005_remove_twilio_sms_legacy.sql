BEGIN;

-- Normalize historical notification logs to WhatsApp click-to-chat provider labels.
UPDATE public.notification_logs
SET channel = 'whatsapp'
WHERE channel = 'sms';

UPDATE public.notification_logs
SET provider = 'wa_me_link',
    provider_message_id = NULL,
    updated_at = NOW()
WHERE channel = 'whatsapp'
  AND provider IN ('twilio', 'twilio_whatsapp');

ALTER TABLE public.notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_channel_check;

ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_channel_check
  CHECK (channel IN ('email', 'whatsapp'));

-- Keep invite logs aligned with the no-SMS policy.
UPDATE public.invite_logs
SET invite_type = 'whatsapp'
WHERE invite_type = 'sms';

ALTER TABLE public.invite_logs
  DROP CONSTRAINT IF EXISTS invite_logs_invite_type_check;

ALTER TABLE public.invite_logs
  ADD CONSTRAINT invite_logs_invite_type_check
  CHECK (invite_type IN ('email', 'whatsapp', 'welcome_pack'));

-- Clean legacy SMS values stored in automation settings JSON.
UPDATE public.ecd_centres
SET communication_automation_settings = jsonb_set(
  communication_automation_settings,
  '{send_channel}',
  to_jsonb(
    CASE
      WHEN communication_automation_settings->>'send_channel' = 'sms' THEN 'whatsapp'
      WHEN communication_automation_settings->>'send_channel' = 'in_app_sms' THEN 'in_app_whatsapp'
      ELSE communication_automation_settings->>'send_channel'
    END
  ),
  true
)
WHERE communication_automation_settings IS NOT NULL
  AND communication_automation_settings ? 'send_channel'
  AND communication_automation_settings->>'send_channel' IN ('sms', 'in_app_sms');

COMMIT;
