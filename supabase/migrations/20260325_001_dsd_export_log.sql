-- Track quarterly DOE export usage per centre (for Starter tier enforcement)
-- Starter plan: 1 free export per calendar quarter (Q1–Q4)

CREATE TABLE IF NOT EXISTS dsd_export_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ecd_id      UUID        NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  quarter     SMALLINT    NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year        SMALLINT    NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (ecd_id, quarter, year)
);

-- Index for fast lookup by centre
CREATE INDEX IF NOT EXISTS idx_dsd_export_log_ecd_id ON dsd_export_log (ecd_id);

-- RLS: ECD admins can read and insert their own centre's log
ALTER TABLE dsd_export_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecd_admin_select_own_export_log"
  ON dsd_export_log FOR SELECT
  USING (
    ecd_id IN (
      SELECT ecd_id FROM ecd_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ecd_admin_insert_own_export_log"
  ON dsd_export_log FOR INSERT
  WITH CHECK (
    ecd_id IN (
      SELECT ecd_id FROM ecd_admins WHERE user_id = auth.uid()
    )
  );
