BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.ecd_centres(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_centre_created
  ON public.notification_logs(centre_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_status_created
  ON public.notification_logs(channel, status, created_at DESC);

DROP TRIGGER IF EXISTS update_notification_logs_updated_at ON public.notification_logs;
CREATE TRIGGER update_notification_logs_updated_at
  BEFORE UPDATE ON public.notification_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_logs_platform_select" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_platform_insert" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_platform_update" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_platform_delete" ON public.notification_logs;

CREATE POLICY "notification_logs_platform_select" ON public.notification_logs
  FOR SELECT USING (public.is_platform_admin());

CREATE POLICY "notification_logs_platform_insert" ON public.notification_logs
  FOR INSERT WITH CHECK (public.is_platform_admin());

CREATE POLICY "notification_logs_platform_update" ON public.notification_logs
  FOR UPDATE USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "notification_logs_platform_delete" ON public.notification_logs
  FOR DELETE USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.enqueue_centre_bootstrap_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  request_id BIGINT;
  webhook_url TEXT := current_setting('app.settings.centre_bootstrap_webhook_url', true);
  webhook_secret TEXT := current_setting('app.settings.centre_bootstrap_webhook_secret', true);
  request_body JSONB;
  request_headers JSONB;
BEGIN
  IF webhook_url IS NULL OR btrim(webhook_url) = '' THEN
    RETURN NEW;
  END IF;

  request_body := jsonb_build_object(
    'event', 'centre_bootstrap_created',
    'event_key', 'centre_bootstrap:' || NEW.id::text,
    'inserted_at', NOW(),
    'centre', jsonb_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'slug', NEW.slug,
      'owner_email', NEW.email,
      'owner_phone', COALESCE(NEW.contact_phone, NEW.phone),
      'primary_contact_name', NEW.primary_contact_name
    )
  );

  request_headers := jsonb_build_object('Content-Type', 'application/json');
  IF webhook_secret IS NOT NULL AND btrim(webhook_secret) <> '' THEN
    request_headers := request_headers || jsonb_build_object('x-centre-bootstrap-secret', webhook_secret);
  END IF;

  SELECT net.http_post(
    url := webhook_url,
    headers := request_headers,
    body := request_body,
    timeout_milliseconds := 5000
  ) INTO request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'enqueue_centre_bootstrap_notification failed for centre %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_centre_bootstrap_notification ON public.ecd_centres;
CREATE TRIGGER trigger_centre_bootstrap_notification
  AFTER INSERT ON public.ecd_centres
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_centre_bootstrap_notification();

COMMIT;
