BEGIN;

CREATE TABLE IF NOT EXISTS public.attendance_register_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  source_file_path TEXT NOT NULL,
  source_file_url TEXT NOT NULL,
  source_file_name TEXT,
  extraction JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_names TEXT[] NOT NULL DEFAULT '{}'::text[],
  extracted_date DATE,
  status TEXT NOT NULL DEFAULT 'extracted',
  selected_name TEXT,
  imported_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  imported_attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_register_imports_status_check
    CHECK (status IN ('extracted', 'reviewed', 'imported', 'failed')),
  CONSTRAINT attendance_register_imports_extraction_is_object
    CHECK (jsonb_typeof(extraction) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_attendance_register_imports_ecd_created
  ON public.attendance_register_imports (ecd_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_register_imports_status
  ON public.attendance_register_imports (ecd_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_register_imports_names_gin
  ON public.attendance_register_imports
  USING GIN (extracted_names);

DROP TRIGGER IF EXISTS update_attendance_register_imports_updated_at
  ON public.attendance_register_imports;
CREATE TRIGGER update_attendance_register_imports_updated_at
  BEFORE UPDATE ON public.attendance_register_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.attendance_register_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_register_imports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_register_imports_ecd_member_select ON public.attendance_register_imports;
DROP POLICY IF EXISTS attendance_register_imports_ecd_member_insert ON public.attendance_register_imports;
DROP POLICY IF EXISTS attendance_register_imports_ecd_member_update ON public.attendance_register_imports;
DROP POLICY IF EXISTS attendance_register_imports_ecd_member_delete ON public.attendance_register_imports;
DROP POLICY IF EXISTS attendance_register_imports_platform_admin_all ON public.attendance_register_imports;

CREATE POLICY attendance_register_imports_ecd_member_select
  ON public.attendance_register_imports
  FOR SELECT
  USING (public.is_ecd_member(ecd_id));

CREATE POLICY attendance_register_imports_ecd_member_insert
  ON public.attendance_register_imports
  FOR INSERT
  WITH CHECK (
    public.is_ecd_member(ecd_id)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY attendance_register_imports_ecd_member_update
  ON public.attendance_register_imports
  FOR UPDATE
  USING (public.is_ecd_member(ecd_id))
  WITH CHECK (public.is_ecd_member(ecd_id));

CREATE POLICY attendance_register_imports_ecd_member_delete
  ON public.attendance_register_imports
  FOR DELETE
  USING (public.is_ecd_member(ecd_id));

CREATE POLICY attendance_register_imports_platform_admin_all
  ON public.attendance_register_imports
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

COMMIT;
