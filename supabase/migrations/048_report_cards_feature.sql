BEGIN;

CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  teacher_name TEXT,
  overall_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE (ecd_id, child_id, term)
);

CREATE TABLE IF NOT EXISTS public.report_card_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_cards_ecd_id ON public.report_cards(ecd_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_child_id ON public.report_cards(child_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_status ON public.report_cards(status);
CREATE INDEX IF NOT EXISTS idx_report_cards_published_at ON public.report_cards(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_card_areas_report_card_id ON public.report_card_areas(report_card_id);

ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_areas FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_cards'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.report_cards', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_card_areas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.report_card_areas', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY report_cards_ecd_member_all
  ON public.report_cards
  FOR ALL
  USING (ecd_id IN (SELECT get_user_ecd_ids()) OR is_platform_admin())
  WITH CHECK (ecd_id IN (SELECT get_user_ecd_ids()) OR is_platform_admin());

CREATE POLICY report_cards_parent_read_published
  ON public.report_cards
  FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = report_cards.child_id
        AND a.parent_id = auth.uid()
        AND a.status = 'enrolled'
    )
  );

CREATE POLICY report_card_areas_ecd_member_all
  ON public.report_card_areas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.report_cards rc
      WHERE rc.id = report_card_areas.report_card_id
        AND (rc.ecd_id IN (SELECT get_user_ecd_ids()) OR is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.report_cards rc
      WHERE rc.id = report_card_areas.report_card_id
        AND (rc.ecd_id IN (SELECT get_user_ecd_ids()) OR is_platform_admin())
    )
  );

CREATE POLICY report_card_areas_parent_read_published
  ON public.report_card_areas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.report_cards rc
      JOIN public.applications a ON a.child_id = rc.child_id
      WHERE rc.id = report_card_areas.report_card_id
        AND rc.status = 'published'
        AND a.parent_id = auth.uid()
        AND a.status = 'enrolled'
    )
  );

COMMIT;
