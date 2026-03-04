-- Fix recursive policy evaluation on public.applications.
-- Rebuild policies with no self-referential lookups.

-- Helper functions must read identity/tenant context from profile tables only.
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_ecd_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ea.ecd_id
  FROM public.ecd_admins ea
  WHERE ea.user_id = auth.uid()
  ORDER BY ea.invited_at DESC
  LIMIT 1
$$;

-- Remove all existing policies to prevent old recursive paths from remaining active.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.applications', pol.policyname);
  END LOOP;
END$$;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications FORCE ROW LEVEL SECURITY;

-- Parents can read only their own applications.
CREATE POLICY applications_parent_select
  ON public.applications
  FOR SELECT
  USING (parent_id = auth.uid());

-- Parents can insert for their own child only.
CREATE POLICY applications_parent_insert
  ON public.applications
  FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.children c
      WHERE c.id = applications.child_id
        AND c.parent_id = auth.uid()
    )
  );

-- Parents can update their own applications.
CREATE POLICY applications_parent_update
  ON public.applications
  FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- ECD admins/staff can read/update applications for their centre.
CREATE POLICY applications_ecd_member_select
  ON public.applications
  FOR SELECT
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_staff')
  );

CREATE POLICY applications_ecd_member_update
  ON public.applications
  FOR UPDATE
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_staff')
  )
  WITH CHECK (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() IN ('ecd_admin', 'ecd_staff')
  );

-- ECD admins can delete centre applications.
CREATE POLICY applications_ecd_admin_delete
  ON public.applications
  FOR DELETE
  USING (
    ecd_id = public.auth_ecd_id()
    AND public.auth_role() = 'ecd_admin'
  );

-- Platform admin retains full access.
CREATE POLICY applications_platform_admin_all
  ON public.applications
  FOR ALL
  USING (public.auth_role() = 'platform_admin')
  WITH CHECK (public.auth_role() = 'platform_admin');
