BEGIN;

-- Move historical bootstrap logs from SMS to WhatsApp before tightening the channel constraint.
UPDATE public.notification_logs
SET channel = 'whatsapp',
    provider = CASE WHEN provider = 'twilio' THEN 'twilio_whatsapp' ELSE provider END
WHERE channel = 'sms';

ALTER TABLE public.notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_channel_check;

ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_channel_check
  CHECK (channel IN ('email', 'whatsapp'));

-- Normalize legacy invite records as part of the Email + WhatsApp-only rollout.
UPDATE public.invite_logs
SET invite_type = 'whatsapp'
WHERE invite_type = 'sms';

ALTER TABLE public.invite_logs
  DROP CONSTRAINT IF EXISTS invite_logs_invite_type_check;

ALTER TABLE public.invite_logs
  ADD CONSTRAINT invite_logs_invite_type_check
  CHECK (invite_type IN ('email', 'whatsapp', 'welcome_pack'));

COMMIT;
