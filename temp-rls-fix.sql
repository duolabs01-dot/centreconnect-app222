-- Step 1: Check existing policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'attendance_register_imports';

-- Step 2: Drop existing policies (run each separately if needed)
DROP POLICY IF EXISTS attendance_register_imports_ecd_member_select ON public.attendance_register_imports;
DROP POLICY IF EXISTS attendance_register_imports_ecd_member_insert ON public.attendance_register_imports;
DROP POLICY IF EXISTS attendance_register_imports_ecd_member_update ON public.attendance_register_imports;
DROP POLICY IF EXISTS attendance_register_imports_platform_admin_all ON public.attendance_register_imports;

-- Step 3: Create new policies
CREATE POLICY attendance_register_imports_ecd_member_select
  ON public.attendance_register_imports FOR SELECT
  USING (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()));

CREATE POLICY attendance_register_imports_ecd_member_insert
  ON public.attendance_register_imports FOR INSERT
  WITH CHECK (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()));

CREATE POLICY attendance_register_imports_ecd_member_update
  ON public.attendance_register_imports FOR UPDATE
  USING (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()));

CREATE POLICY attendance_register_imports_platform_admin_all
  ON public.attendance_register_imports FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
