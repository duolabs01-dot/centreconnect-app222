-- supabase/migrations/038_daily_reports.sql
-- Daily Reports feature for child engagement and parent retention.

CREATE TABLE IF NOT EXISTS public.child_daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  
  -- Meals
  breakfast_eaten TEXT CHECK (breakfast_eaten IN ('all','some','none','not_offered')),
  lunch_eaten TEXT CHECK (lunch_eaten IN ('all','some','none','not_offered')),
  snack_eaten TEXT CHECK (snack_eaten IN ('all','some','none','not_offered')),
  
  -- Rest
  nap_start TIME,
  nap_end TIME,
  nap_quality TEXT CHECK (nap_quality IN ('good','short','none')),
  
  -- Mood/Behaviour
  mood TEXT CHECK (mood IN ('happy','good','tired','unsettled','upset')),
  behaviour_notes TEXT,
  
  -- Activities
  activities TEXT[], -- e.g. ['painting','outdoor_play','story_time','music']
  
  -- Teacher notes
  teacher_notes TEXT,
  
  -- Photo (URL to storage)
  photo_url TEXT,
  
  -- Publishing
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.user_profiles(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(ecd_id, child_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_ecd_date ON public.child_daily_reports(ecd_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_child ON public.child_daily_reports(child_id, report_date DESC);

ALTER TABLE public.child_daily_reports ENABLE ROW LEVEL SECURITY;

-- ECD staff can insert/update their own centre's reports
DROP POLICY IF EXISTS "daily_reports_ecd_write" ON public.child_daily_reports;
CREATE POLICY "daily_reports_ecd_write" ON public.child_daily_reports
  FOR ALL USING (
    user_is_ecd_admin(ecd_id) 
    OR EXISTS(SELECT 1 FROM public.ecd_admins WHERE ecd_id = child_daily_reports.ecd_id AND user_id = auth.uid())
  );

-- Parents can read published reports for their children
DROP POLICY IF EXISTS "daily_reports_parent_read" ON public.child_daily_reports;
CREATE POLICY "daily_reports_parent_read" ON public.child_daily_reports
  FOR SELECT USING (
    published_at IS NOT NULL AND
    EXISTS(
      SELECT 1 FROM public.applications a
      JOIN public.parents p ON a.parent_id = p.id
      WHERE a.child_id = child_daily_reports.child_id
      AND p.id = auth.uid()
      AND a.status = 'enrolled'
    )
  );
