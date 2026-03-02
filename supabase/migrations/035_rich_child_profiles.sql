BEGIN;

-- Rich child profile fields for manual enrollment workflows.
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS allergies text[],
  ADD COLUMN IF NOT EXISTS medical_conditions text[],
  ADD COLUMN IF NOT EXISTS medications text[],
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS medical_aid_number text,
  ADD COLUMN IF NOT EXISTS immunization_record jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS dietary_restrictions text,
  ADD COLUMN IF NOT EXISTS special_needs_notes text,
  ADD COLUMN IF NOT EXISTS last_checkup_date date,
  ADD COLUMN IF NOT EXISTS development_notes text;

-- Backward-compatible upgrades from legacy scalar text columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'children'
      AND column_name = 'allergies'
      AND udt_name <> '_text'
  ) THEN
    ALTER TABLE public.children
      ALTER COLUMN allergies TYPE text[]
      USING CASE
        WHEN allergies IS NULL OR btrim(allergies) = '' THEN NULL
        WHEN position(',' IN allergies) > 0 THEN regexp_split_to_array(allergies, '\s*,\s*')
        ELSE ARRAY[allergies]
      END;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'children'
      AND column_name = 'medical_conditions'
      AND udt_name <> '_text'
  ) THEN
    ALTER TABLE public.children
      ALTER COLUMN medical_conditions TYPE text[]
      USING CASE
        WHEN medical_conditions IS NULL OR btrim(medical_conditions) = '' THEN NULL
        WHEN position(',' IN medical_conditions) > 0 THEN regexp_split_to_array(medical_conditions, '\s*,\s*')
        ELSE ARRAY[medical_conditions]
      END;
  END IF;
END$$;

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children FORCE ROW LEVEL SECURITY;

-- Reset children policies so policy intent is unambiguous.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'children'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.children', pol.policyname);
  END LOOP;
END$$;

-- Parents: read-only access to their own children.
CREATE POLICY children_parent_read_only
  ON public.children
  FOR SELECT
  USING (parent_id = auth.uid());

-- ECD members: full access to child records associated with their centre.
CREATE POLICY children_ecd_member_select
  ON public.children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = children.id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  );

CREATE POLICY children_ecd_member_insert
  ON public.children
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM get_user_ecd_ids())
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.parent_id = children.parent_id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  );

CREATE POLICY children_ecd_member_update
  ON public.children
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = children.id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = children.id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  );

CREATE POLICY children_ecd_member_delete
  ON public.children
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = children.id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  );

-- Platform admins retain unrestricted access.
CREATE POLICY children_platform_admin_all
  ON public.children
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

COMMIT;
