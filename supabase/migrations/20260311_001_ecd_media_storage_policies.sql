BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ecd-media', 'ecd-media', TRUE)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

CREATE OR REPLACE FUNCTION public.ecd_media_object_ecd_id(object_name TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN split_part(object_name, '/', 1) = 'ecd'
        AND split_part(object_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(object_name, '/', 2)::uuid
      WHEN split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(object_name, '/', 1)::uuid
      ELSE NULL
    END
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ecd_media_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ecd_admins ea
    WHERE ea.user_id = auth.uid()
      AND ea.ecd_id = public.ecd_media_object_ecd_id(object_name)
      AND ea.role IN ('ecd_admin', 'ecd_staff', 'ecd_supervisor')
  )
$$;

DROP POLICY IF EXISTS ecd_media_objects_select_member ON storage.objects;
DROP POLICY IF EXISTS ecd_media_objects_insert_member ON storage.objects;
DROP POLICY IF EXISTS ecd_media_objects_update_member ON storage.objects;
DROP POLICY IF EXISTS ecd_media_objects_delete_member ON storage.objects;
DROP POLICY IF EXISTS ecd_media_objects_select_public ON storage.objects;

CREATE POLICY ecd_media_objects_select_public
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ecd-media');

CREATE POLICY ecd_media_objects_insert_member
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ecd-media'
    AND public.can_manage_ecd_media_object(name)
  );

CREATE POLICY ecd_media_objects_update_member
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'ecd-media'
    AND public.can_manage_ecd_media_object(name)
  )
  WITH CHECK (
    bucket_id = 'ecd-media'
    AND public.can_manage_ecd_media_object(name)
  );

CREATE POLICY ecd_media_objects_delete_member
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ecd-media'
    AND public.can_manage_ecd_media_object(name)
  );

COMMIT;