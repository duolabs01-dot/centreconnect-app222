BEGIN;

DROP POLICY IF EXISTS attendance_register_imports_ecd_member_insert ON public.attendance_register_imports;

CREATE POLICY attendance_register_imports_test_insert
  ON public.attendance_register_imports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

COMMIT;
