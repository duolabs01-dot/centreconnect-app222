-- Add is_public_listing flag to distinguish seeded/unclaimed public listings
-- from active CentreConnect customers (is_claimed is derived from owner_id IS NOT NULL)

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS is_public_listing BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ecd_centres_is_public_listing
  ON public.ecd_centres(is_public_listing)
  WHERE is_public_listing = TRUE;

-- Mark the three test/seed centres as public listings.
-- These are NOT CentreConnect customers — they are directory entries only.
-- Setting website_published = FALSE so they rely solely on is_public_listing
-- for visibility, making the distinction clear.
UPDATE public.ecd_centres
SET
  is_public_listing = TRUE,
  website_published = FALSE
WHERE name IN (
  'Lombardy East Sunshine Seeds ECD',
  'Alexandra Brightnest Early Learning',
  'Alexandra Little Explorers ECD Centre'
);

-- Recreate view to include public listings alongside claimed centres.
-- A centre appears in the directory if:
--   website_published = TRUE  (CentreConnect customers who have published their profile)
--   OR is_public_listing = TRUE  (seeded unclaimed entries visible to parents)
-- In both cases is_deleted must be FALSE.

DROP VIEW IF EXISTS public.public_ecd_centres;

CREATE VIEW public.public_ecd_centres AS
SELECT
  c.id,
  c.slug,
  c.name,
  c.tagline,
  c.description,
  c.suburb,
  c.city,
  c.province,
  c.postal_code,
  c.age_groups,
  c.logo_url,
  c.cover_image_url,
  c.primary_color,
  c.is_registered,
  c.fees_display_mode,
  c.monthly_fee_min,
  c.monthly_fee_max,
  c.registration_fee,
  c.subsidy_accepted,
  c.fees_notes,
  c.fees_last_updated_at,
  c.contact_whatsapp,
  c.contact_phone,
  c.age_group_pricing,
  c.communication_automation_settings -> 'tenant_admin_overrides' -> 'operating_schedule' AS operating_schedule,
  c.communication_automation_settings -> 'tenant_admin_overrides' ->> 'operating_hours' AS operating_hours_summary,
  COALESCE((c.communication_automation_settings -> 'tenant_admin_overrides' -> 'aftercare' ->> 'available')::boolean, FALSE) AS aftercare_available,
  c.communication_automation_settings -> 'tenant_admin_overrides' -> 'aftercare' ->> 'end_time' AS aftercare_end_time,
  COALESCE(classes.classrooms, '[]'::jsonb) AS classrooms,
  c.owner_id,
  c.is_public_listing
FROM public.ecd_centres c
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ec.id,
      'name', ec.name,
      'age_group', ec.age_group,
      'practitioner_name', ec.practitioner_name
    ) ORDER BY ec.created_at ASC, ec.name ASC
  ) AS classrooms
  FROM public.ecd_classes ec
  WHERE ec.ecd_id = c.id
) classes ON TRUE
WHERE (c.website_published = TRUE OR c.is_public_listing = TRUE)
  AND c.is_deleted = FALSE;

GRANT SELECT ON public.public_ecd_centres TO anon, authenticated;
