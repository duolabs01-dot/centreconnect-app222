-- Report Cards feature: term-based child progress reports
-- ECD staff create report cards per child per term, parents view published ones.

-- ============================================================
-- 1. report_cards table
-- ============================================================
CREATE TABLE IF NOT EXISTS report_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id        UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  term          TEXT NOT NULL,                       -- e.g. "Term 1 2026"
  period_start  DATE,
  period_end    DATE,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  teacher_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  teacher_name  TEXT,
  overall_comment TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at  TIMESTAMPTZ,
  UNIQUE(ecd_id, child_id, term)
);

-- ============================================================
-- 2. report_card_areas table (development area ratings)
-- ============================================================
CREATE TABLE IF NOT EXISTS report_card_areas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id  UUID NOT NULL REFERENCES report_cards(id) ON DELETE CASCADE,
  area_name       TEXT NOT NULL,                     -- e.g. "Language", "Numeracy"
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_report_cards_ecd_id ON report_cards(ecd_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_child_id ON report_cards(child_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_status ON report_cards(status);
CREATE INDEX IF NOT EXISTS idx_report_card_areas_report ON report_card_areas(report_card_id);

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE report_card_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_card_areas FORCE ROW LEVEL SECURITY;

-- ECD staff: full CRUD on their centre's report cards
CREATE POLICY "report_cards_ecd_all" ON report_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ecd_admins
      WHERE ecd_admins.ecd_id = report_cards.ecd_id
        AND ecd_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ecd_admins
      WHERE ecd_admins.ecd_id = report_cards.ecd_id
        AND ecd_admins.user_id = auth.uid()
    )
  );

-- Parents: read published report cards for their enrolled children
CREATE POLICY "report_cards_parent_read" ON report_cards
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.child_id = report_cards.child_id
        AND a.parent_id = auth.uid()
        AND a.status = 'enrolled'
    )
  );

-- Platform admin: full access
CREATE POLICY "report_cards_platform_admin" ON report_cards
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- report_card_areas: inherit access from parent report_card
CREATE POLICY "report_card_areas_ecd_all" ON report_card_areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM report_cards rc
      JOIN ecd_admins ea ON ea.ecd_id = rc.ecd_id AND ea.user_id = auth.uid()
      WHERE rc.id = report_card_areas.report_card_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM report_cards rc
      JOIN ecd_admins ea ON ea.ecd_id = rc.ecd_id AND ea.user_id = auth.uid()
      WHERE rc.id = report_card_areas.report_card_id
    )
  );

CREATE POLICY "report_card_areas_parent_read" ON report_card_areas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM report_cards rc
      JOIN applications a ON a.child_id = rc.child_id
        AND a.parent_id = auth.uid()
        AND a.status = 'enrolled'
      WHERE rc.id = report_card_areas.report_card_id
        AND rc.status = 'published'
    )
  );

CREATE POLICY "report_card_areas_platform_admin" ON report_card_areas
  FOR ALL USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
