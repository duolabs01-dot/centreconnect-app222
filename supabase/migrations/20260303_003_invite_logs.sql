BEGIN;

CREATE TABLE IF NOT EXISTS public.invite_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  centre_id UUID REFERENCES public.ecd_centres(id) ON DELETE SET NULL,
  owner_email TEXT,
  owner_phone TEXT,
  invite_type TEXT NOT NULL
    CHECK (invite_type IN ('email', 'sms', 'welcome_pack')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'claimed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_logs_centre_sent
  ON public.invite_logs(centre_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_invite_logs_type_status_sent
  ON public.invite_logs(invite_type, status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_invite_logs_owner_email
  ON public.invite_logs(owner_email)
  WHERE owner_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invite_logs_owner_phone
  ON public.invite_logs(owner_phone)
  WHERE owner_phone IS NOT NULL;

ALTER TABLE public.invite_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_logs_select_platform_only" ON public.invite_logs;
DROP POLICY IF EXISTS "invite_logs_insert_platform_only" ON public.invite_logs;
DROP POLICY IF EXISTS "invite_logs_update_platform_only" ON public.invite_logs;
DROP POLICY IF EXISTS "invite_logs_delete_platform_only" ON public.invite_logs;

CREATE POLICY "invite_logs_select_platform_only" ON public.invite_logs
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "invite_logs_insert_platform_only" ON public.invite_logs
  FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY "invite_logs_update_platform_only" ON public.invite_logs
  FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "invite_logs_delete_platform_only" ON public.invite_logs
  FOR DELETE USING (is_platform_admin());

COMMIT;
