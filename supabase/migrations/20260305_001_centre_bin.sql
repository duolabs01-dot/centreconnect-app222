-- Add soft-delete support for ECD centres and update the RLS policy to filter them out.

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.user_profiles(id);

DROP POLICY IF EXISTS "centres_select_strict" ON public.ecd_centres;

CREATE POLICY "centres_select_strict" ON public.ecd_centres
  FOR SELECT
  USING (
    (
      is_active = TRUE
      AND is_deleted = FALSE
    )
    OR is_platform_admin()
    OR id IN (SELECT get_user_ecd_ids())
  );
