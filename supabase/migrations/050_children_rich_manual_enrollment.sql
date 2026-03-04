BEGIN;

-- Ensure children table supports rich manual enrollment fields end-to-end.
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enrollment_start_date DATE,
  ADD COLUMN IF NOT EXISTS guardian_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS intake_documents JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_prefill_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS ai_confidence_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS immunization_status TEXT,
  ADD COLUMN IF NOT EXISTS immunization_due_date DATE,
  ADD COLUMN IF NOT EXISTS immunization_notes TEXT;

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_guardian_contacts_is_array;
ALTER TABLE public.children
  ADD CONSTRAINT children_guardian_contacts_is_array
  CHECK (jsonb_typeof(guardian_contacts) = 'array');

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_emergency_contacts_is_array;
ALTER TABLE public.children
  ADD CONSTRAINT children_emergency_contacts_is_array
  CHECK (jsonb_typeof(emergency_contacts) = 'array');

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_intake_documents_is_object;
ALTER TABLE public.children
  ADD CONSTRAINT children_intake_documents_is_object
  CHECK (jsonb_typeof(intake_documents) = 'object');

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_immunization_status_check;
ALTER TABLE public.children
  ADD CONSTRAINT children_immunization_status_check
  CHECK (
    immunization_status IS NULL
    OR immunization_status IN ('up_to_date', 'catching_up', 'not_started', 'unknown')
  );

CREATE INDEX IF NOT EXISTS idx_children_ecd_id ON public.children(ecd_id);
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_enrollment_start_date ON public.children(enrollment_start_date);
CREATE INDEX IF NOT EXISTS idx_children_immunization_due_date ON public.children(immunization_due_date);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'children'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.children', pol.policyname);
  END LOOP;
END
$$;

-- Parent access to their own child profiles.
CREATE POLICY children_parent_select_own
  ON public.children
  FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY children_parent_insert_own
  ON public.children
  FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY children_parent_update_own
  ON public.children
  FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY children_parent_delete_own
  ON public.children
  FOR DELETE
  USING (parent_id = auth.uid());

-- ECD members can fully manage child profiles for their own centres.
CREATE POLICY children_ecd_member_select
  ON public.children
  FOR SELECT
  USING (
    ecd_id IN (SELECT get_user_ecd_ids())
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = children.id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  );

CREATE POLICY children_ecd_member_insert
  ON public.children
  FOR INSERT
  WITH CHECK (ecd_id IN (SELECT get_user_ecd_ids()));

CREATE POLICY children_ecd_member_update
  ON public.children
  FOR UPDATE
  USING (
    ecd_id IN (SELECT get_user_ecd_ids())
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = children.id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  )
  WITH CHECK (
    ecd_id IN (SELECT get_user_ecd_ids())
    OR EXISTS (
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
    ecd_id IN (SELECT get_user_ecd_ids())
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = children.id
        AND a.ecd_id IN (SELECT get_user_ecd_ids())
    )
  );

CREATE POLICY children_platform_admin_all
  ON public.children
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

COMMIT;
