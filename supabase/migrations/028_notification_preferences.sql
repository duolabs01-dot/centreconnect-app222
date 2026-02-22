CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_announcements BOOLEAN NOT NULL DEFAULT TRUE,
  email_applications BOOLEAN NOT NULL DEFAULT TRUE,
  email_job_applications BOOLEAN NOT NULL DEFAULT TRUE,
  push_announcements BOOLEAN NOT NULL DEFAULT TRUE,
  push_applications BOOLEAN NOT NULL DEFAULT TRUE,
  push_pickup BOOLEAN NOT NULL DEFAULT TRUE,
  digest_frequency TEXT NOT NULL DEFAULT 'realtime'
    CHECK (digest_frequency IN ('realtime', 'daily', 'weekly', 'off')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_own_all" ON public.notification_preferences;
CREATE POLICY "notification_preferences_own_all"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

