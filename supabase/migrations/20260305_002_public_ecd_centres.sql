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
  age_group_pricing
FROM public.ecd_centres
WHERE is_active = TRUE
  AND website_published = TRUE
  AND is_deleted = FALSE;

GRANT SELECT ON public.public_ecd_centres TO anon, authenticated;
