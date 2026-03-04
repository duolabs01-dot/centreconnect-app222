-- Website Builder v1 foundations:
-- - website publish flag on centres
-- - public website visibility respects publish flag
-- - public read of website content/media for published centres

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS website_published BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS website_published_at TIMESTAMPTZ;

UPDATE public.ecd_centres
SET website_published = TRUE
WHERE website_published IS NULL;

UPDATE public.ecd_centres
SET website_published_at = COALESCE(website_published_at, NOW())
WHERE website_published = TRUE
  AND website_published_at IS NULL;

-- Public centre directory/profile view should only expose published websites.
CREATE OR REPLACE VIEW public.public_ecd_centres AS
SELECT
  id,
  slug,
  name,
  tagline,
  description,
  suburb,
  city,
  province,
  postal_code,
  age_groups,
  logo_url,
  cover_image_url,
  primary_color,
  is_registered,
  fees_display_mode,
  monthly_fee_min,
  monthly_fee_max,
  registration_fee,
  subsidy_accepted,
  fees_notes,
  fees_last_updated_at,
  contact_whatsapp,
  contact_phone
FROM public.ecd_centres
WHERE is_active = TRUE
  AND website_published = TRUE;

GRANT SELECT ON public.public_ecd_centres TO anon, authenticated;

-- Public read of centres also respects website publication.
DROP POLICY IF EXISTS "centres_select_strict" ON public.ecd_centres;
CREATE POLICY "centres_select_strict" ON public.ecd_centres
  FOR SELECT
  USING (
    (is_active = TRUE AND website_published = TRUE)
    OR is_platform_admin()
    OR id IN (SELECT get_user_ecd_ids())
  );

-- Allow public reads of website content for published centres.
DROP POLICY IF EXISTS "ecd_content_select_public_published" ON public.ecd_content;
CREATE POLICY "ecd_content_select_public_published" ON public.ecd_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.ecd_centres c
      WHERE c.id = ecd_content.ecd_id
        AND c.is_active = TRUE
        AND c.website_published = TRUE
    )
  );

-- Allow public reads of website media for published centres.
DROP POLICY IF EXISTS "ecd_media_select_public_published" ON public.ecd_media;
CREATE POLICY "ecd_media_select_public_published" ON public.ecd_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.ecd_centres c
      WHERE c.id = ecd_media.ecd_id
        AND c.is_active = TRUE
        AND c.website_published = TRUE
    )
  );
