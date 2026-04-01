-- Expose latitude and longitude from ecd_centres in the public_ecd_centres view.
-- Previously coordinates were fetched via a separate secondary query in the search API.
-- Adding them to the view keeps the data contract consistent and removes the need
-- for any secondary geo lookup when serving the directory or map features.

DROP VIEW IF EXISTS public.public_ecd_centres;

CREATE VIEW public.public_ecd_centres AS
SELECT
  c.id,
  c.slug,
  c.name,
  c.tagline,
  c.description,
  c.address,
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
  c.latitude,
  c.longitude,
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
