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
  contact_phone,
  age_group_pricing,
  communication_automation_settings -> 'tenant_admin_overrides' -> 'operating_schedule' AS operating_schedule,
  communication_automation_settings -> 'tenant_admin_overrides' ->> 'operating_hours' AS operating_hours_summary
FROM public.ecd_centres
WHERE is_active = TRUE
  AND website_published = TRUE
  AND is_deleted = FALSE;

GRANT SELECT ON public.public_ecd_centres TO anon, authenticated;

UPDATE public.ecd_centres
SET
  registration_fee = COALESCE(registration_fee, 200),
  subsidy_accepted = TRUE,
  age_groups = ARRAY['1-2', '2-4', '4-5'],
  communication_automation_settings = jsonb_set(
    jsonb_set(
      COALESCE(communication_automation_settings, '{}'::jsonb),
      '{tenant_admin_overrides,operating_schedule}',
      '{"mon":{"open":"07:00","close":"17:30"},"tue":{"open":"07:00","close":"17:30"},"wed":{"open":"07:00","close":"17:30"},"thu":{"open":"07:00","close":"17:30"},"fri":{"open":"07:00","close":"17:30"},"sat":null,"sun":null}'::jsonb,
      true
    ),
    '{tenant_admin_overrides,operating_hours}',
    '"Mon-Fri 07:00-17:30"'::jsonb,
    true
  )
WHERE LOWER(name) LIKE 'bajabulile%';
