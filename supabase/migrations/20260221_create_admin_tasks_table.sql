  -- supabase/migrations/20260221_create_admin_tasks_table.sql
  CREATE TABLE IF NOT EXISTS public.admin_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    ecd_id      UUID REFERENCES public.ecd_centres(id),
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed','cancelled')),
    created_by  UUID REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );
  ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "platform_admin_all_tasks" ON public.admin_tasks
    FOR ALL USING (public.auth_role() = 'platform_admin');