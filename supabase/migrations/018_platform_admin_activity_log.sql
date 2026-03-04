CREATE TABLE IF NOT EXISTS public.platform_admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'service_application',
      'centre',
      'subscription',
      'tenant',
      'bulk'
    )
  ),
  entity_id UUID,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_activity_log_created
  ON public.platform_admin_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_admin_activity_log_entity
  ON public.platform_admin_activity_log(entity_type, entity_id, created_at DESC);

ALTER TABLE public.platform_admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin_activity_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admin_activity_log_select_platform_only" ON public.platform_admin_activity_log;
DROP POLICY IF EXISTS "platform_admin_activity_log_insert_platform_only" ON public.platform_admin_activity_log;
DROP POLICY IF EXISTS "platform_admin_activity_log_update_platform_only" ON public.platform_admin_activity_log;
DROP POLICY IF EXISTS "platform_admin_activity_log_delete_platform_only" ON public.platform_admin_activity_log;

CREATE POLICY "platform_admin_activity_log_select_platform_only" ON public.platform_admin_activity_log
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "platform_admin_activity_log_insert_platform_only" ON public.platform_admin_activity_log
  FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_activity_log_update_platform_only" ON public.platform_admin_activity_log
  FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_activity_log_delete_platform_only" ON public.platform_admin_activity_log
  FOR DELETE USING (is_platform_admin());
