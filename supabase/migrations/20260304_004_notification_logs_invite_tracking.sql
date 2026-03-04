BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.ecd_centres(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'opened', 'claimed', 'failed')),
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_key, channel)
);

ALTER TABLE public.notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_status_check;

ALTER TABLE public.notification_logs
  ADD CONSTRAINT notification_logs_status_check
  CHECK (status IN ('sent', 'opened', 'claimed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_notification_logs_event_status_created
  ON public.notification_logs(event_type, status, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.invite_logs') IS NOT NULL THEN
    INSERT INTO public.notification_logs (
      centre_id,
      event_key,
      event_type,
      channel,
      recipient,
      status,
      provider,
      payload,
      created_at,
      updated_at
    )
    SELECT
      il.centre_id,
      'legacy_invite:' || il.id::text,
      CASE
        WHEN il.invite_type = 'welcome_pack' THEN 'welcome_pack'
        ELSE 'admin_access_invite'
      END AS event_type,
      CASE
        WHEN il.invite_type = 'whatsapp' THEN 'whatsapp'
        ELSE 'email'
      END AS channel,
      CASE
        WHEN il.invite_type = 'whatsapp' THEN COALESCE(il.owner_phone, il.owner_email)
        ELSE il.owner_email
      END AS recipient,
      il.status,
      'legacy_invite_logs',
      jsonb_build_object(
        'legacy_invite_id', il.id,
        'legacy_invite_type', il.invite_type,
        'notes', il.notes
      ),
      il.sent_at,
      COALESCE(il.sent_at, NOW())
    FROM public.invite_logs il
    ON CONFLICT (event_key, channel) DO NOTHING;
  END IF;
END;
$$;

COMMIT;
