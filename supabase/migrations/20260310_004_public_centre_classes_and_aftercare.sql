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
  c.owner_id
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
WHERE c.is_active = TRUE
  AND c.website_published = TRUE
  AND c.is_deleted = FALSE;

GRANT SELECT ON public.public_ecd_centres TO anon, authenticated;

WITH bajabulile AS (
  SELECT id, COALESCE(communication_automation_settings, '{}'::jsonb) AS settings
  FROM public.ecd_centres
  WHERE LOWER(name) LIKE 'bajabulile%'
  LIMIT 1
)
UPDATE public.ecd_centres centre
SET communication_automation_settings = jsonb_set(
  COALESCE(bajabulile.settings, '{}'::jsonb),
  '{tenant_admin_overrides,aftercare}',
  '{"available":false,"end_time":null}'::jsonb,
  true
)
FROM bajabulile
WHERE centre.id = bajabulile.id;

INSERT INTO public.ecd_classes (ecd_id, name, age_group, practitioner_name)
SELECT centre.id, class_name, age_group, NULL
FROM public.ecd_centres centre
CROSS JOIN (
  VALUES
    ('Class A: Tiny Bears', '1-2 years'),
    ('Class B: Little Cubs', '3-4 years'),
    ('Class C: Cheetahs', '5-6 years')
) AS classes(class_name, age_group)
WHERE LOWER(centre.name) LIKE 'bajabulile%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.ecd_classes existing
    WHERE existing.ecd_id = centre.id
      AND LOWER(existing.name) = LOWER(classes.class_name)
  );
