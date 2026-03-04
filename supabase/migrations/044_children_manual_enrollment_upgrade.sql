BEGIN;

-- Extend children for richer manual enrollment in ECD dashboard.
ALTER TABLE public.children
  ALTER COLUMN parent_id DROP NOT NULL,
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enrollment_source TEXT NOT NULL DEFAULT 'parent',
  ADD COLUMN IF NOT EXISTS enrollment_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS guardian_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS intake_documents JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_prefill_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS ai_confidence_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_link_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrollment_notes TEXT;

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_enrollment_source_check;
ALTER TABLE public.children
  ADD CONSTRAINT children_enrollment_source_check
  CHECK (enrollment_source IN ('parent', 'ecd_manual'));

ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_enrollment_status_check;
ALTER TABLE public.children
  ADD CONSTRAINT children_enrollment_status_check
  CHECK (enrollment_status IN ('draft', 'pending_parent', 'active', 'archived'));

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

UPDATE public.children c
SET ecd_id = derived.ecd_id
FROM (
  SELECT DISTINCT ON (a.child_id)
    a.child_id,
    a.ecd_id
  FROM public.applications a
  WHERE a.child_id IS NOT NULL
  ORDER BY a.child_id, a.submitted_at DESC
) AS derived
WHERE c.id = derived.child_id
  AND c.ecd_id IS NULL;

UPDATE public.children
SET enrollment_source = 'ecd_manual',
    enrollment_status = CASE
      WHEN enrollment_status = 'active' THEN 'pending_parent'
      ELSE enrollment_status
    END
WHERE parent_id IS NULL
  AND ecd_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_children_ecd_id ON public.children(ecd_id);
CREATE INDEX IF NOT EXISTS idx_children_enrollment_status ON public.children(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_children_enrollment_source ON public.children(enrollment_source);

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
END$$;

-- Parent access to own linked children.
CREATE POLICY children_parent_select
  ON public.children
  FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY children_parent_insert
  ON public.children
  FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY children_parent_update
  ON public.children
  FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY children_parent_delete
  ON public.children
  FOR DELETE
  USING (parent_id = auth.uid());

-- ECD members can fully manage manual enrollment records tied to their centres,
-- and existing children linked via applications.
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
  WITH CHECK (
    ecd_id IN (SELECT get_user_ecd_ids())
  );

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
