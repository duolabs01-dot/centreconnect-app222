-- supabase/migrations/032_daily_reports.sql
CREATE TABLE IF NOT EXISTS child_daily_reports (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
report_date DATE NOT NULL,
breakfast_eaten TEXT CHECK (breakfast_eaten IN
('all','some','none','not_offered')),
lunch_eaten TEXT CHECK (lunch_eaten IN ('all','some','none','not_offered')),
snack_eaten TEXT CHECK (snack_eaten IN ('all','some','none','not_offered')),
nap_start TIME,
nap_end TIME,
mood TEXT CHECK (mood IN ('happy','good','tired','unsettled','upset')),
activities TEXT[],
teacher_notes TEXT,
photo_url TEXT,
published_at TIMESTAMPTZ,
published_by UUID REFERENCES user_profiles(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(ecd_id, child_id, report_date)
);
ALTER TABLE child_daily_reports ENABLE ROW LEVEL SECURITY;
-- ECD staff can write their own centre's reports:
CREATE POLICY "daily_reports_ecd_write" ON child_daily_reports
FOR ALL USING (
EXISTS(SELECT 1 FROM ecd_admins WHERE ecd_id = child_daily_reports.ecd_id
AND user_id = auth.uid())
);
-- Parents can read published reports for their enrolled children:
CREATE POLICY "daily_reports_parent_read" ON child_daily_reports
FOR SELECT USING (
published_at IS NOT NULL AND
EXISTS(
SELECT 1 FROM applications a
JOIN parents p ON a.parent_id = p.id
WHERE a.child_id = child_daily_reports.child_id
AND p.id = auth.uid()
AND a.status = 'enrolled'
)
);
