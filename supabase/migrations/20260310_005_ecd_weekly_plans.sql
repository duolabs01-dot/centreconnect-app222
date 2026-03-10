CREATE TABLE IF NOT EXISTS public.ecd_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,
  title TEXT NOT NULL,
  theme TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ecd_id, week_of)
);

CREATE TABLE IF NOT EXISTS public.ecd_weekly_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.ecd_weekly_plans(id) ON DELETE CASCADE,
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  bucket TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'blocked')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecd_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecd_weekly_plan_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ECD members can manage weekly plans" ON public.ecd_weekly_plans;
CREATE POLICY "ECD members can manage weekly plans"
  ON public.ecd_weekly_plans
  FOR ALL
  USING (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()))
  WITH CHECK (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "ECD members can manage weekly plan tasks" ON public.ecd_weekly_plan_tasks;
CREATE POLICY "ECD members can manage weekly plan tasks"
  ON public.ecd_weekly_plan_tasks
  FOR ALL
  USING (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()))
  WITH CHECK (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ecd_weekly_plans_ecd_week ON public.ecd_weekly_plans(ecd_id, week_of DESC);
CREATE INDEX IF NOT EXISTS idx_ecd_weekly_plan_tasks_ecd_day ON public.ecd_weekly_plan_tasks(ecd_id, day_of_week, status);
