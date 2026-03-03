-- Add editable age-group pricing for each ECD centre.
-- This powers automatic fee defaults across applications, offers, and invoices.

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS age_group_pricing JSONB;

ALTER TABLE public.ecd_centres
  ALTER COLUMN age_group_pricing SET DEFAULT jsonb_build_object(
    '0-2', jsonb_build_object('label', '0-2 years', 'monthly_fee_cents', 0),
    '2-4', jsonb_build_object('label', '2-4 years', 'monthly_fee_cents', 0),
    '4-6', jsonb_build_object('label', '4-6 years', 'monthly_fee_cents', 0),
    '6+', jsonb_build_object('label', 'Aftercare (6+)', 'monthly_fee_cents', 0)
  );

UPDATE public.ecd_centres
SET age_group_pricing = jsonb_build_object(
  '0-2', jsonb_build_object('label', '0-2 years', 'monthly_fee_cents', COALESCE(ROUND(monthly_fee_min * 100)::INTEGER, 0)),
  '2-4', jsonb_build_object('label', '2-4 years', 'monthly_fee_cents', COALESCE(ROUND(monthly_fee_min * 100)::INTEGER, 0)),
  '4-6', jsonb_build_object('label', '4-6 years', 'monthly_fee_cents', COALESCE(ROUND(monthly_fee_min * 100)::INTEGER, 0)),
  '6+', jsonb_build_object('label', 'Aftercare (6+)', 'monthly_fee_cents', COALESCE(ROUND(monthly_fee_min * 100)::INTEGER, 0))
)
WHERE age_group_pricing IS NULL
   OR age_group_pricing = '{}'::jsonb;

ALTER TABLE public.ecd_centres
  ALTER COLUMN age_group_pricing SET NOT NULL;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS monthly_fee_cents INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ecd_centres_age_group_pricing_object_chk'
  ) THEN
    ALTER TABLE public.ecd_centres
      ADD CONSTRAINT ecd_centres_age_group_pricing_object_chk
      CHECK (jsonb_typeof(age_group_pricing) = 'object');
  END IF;
END$$;

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
  age_group_pricing,
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

CREATE OR REPLACE FUNCTION public.resolve_age_group_monthly_fee_cents(
  p_ecd_id UUID,
  p_child_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pricing JSONB;
  v_monthly_fee_min NUMERIC;
  v_child_dob DATE;
  v_age_years INTEGER;
  v_band_key TEXT;
  v_band JSONB;
  v_fee_cents INTEGER;
BEGIN
  SELECT age_group_pricing, monthly_fee_min
  INTO v_pricing, v_monthly_fee_min
  FROM public.ecd_centres
  WHERE id = p_ecd_id;

  SELECT date_of_birth
  INTO v_child_dob
  FROM public.children
  WHERE id = p_child_id;

  IF v_child_dob IS NOT NULL THEN
    v_age_years := DATE_PART('year', AGE(CURRENT_DATE, v_child_dob));
  ELSE
    v_age_years := NULL;
  END IF;

  IF v_age_years IS NULL THEN
    v_band_key := '2-4';
  ELSIF v_age_years < 2 THEN
    v_band_key := '0-2';
  ELSIF v_age_years < 4 THEN
    v_band_key := '2-4';
  ELSIF v_age_years < 6 THEN
    v_band_key := '4-6';
  ELSE
    v_band_key := '6+';
  END IF;

  v_band := COALESCE(v_pricing -> v_band_key, '{}'::jsonb);
  v_fee_cents := COALESCE(NULLIF(v_band ->> 'monthly_fee_cents', '')::INTEGER, 0);

  IF v_fee_cents <= 0 AND v_monthly_fee_min IS NOT NULL THEN
    v_fee_cents := GREATEST(ROUND(v_monthly_fee_min * 100)::INTEGER, 0);
  END IF;

  RETURN GREATEST(COALESCE(v_fee_cents, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.applications_sync_monthly_fee_from_age_group_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.monthly_fee_cents, 0) <= 0 THEN
    NEW.monthly_fee_cents := public.resolve_age_group_monthly_fee_cents(NEW.ecd_id, NEW.child_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_sync_monthly_fee_from_age_group_pricing_trigger ON public.applications;
CREATE TRIGGER applications_sync_monthly_fee_from_age_group_pricing_trigger
  BEFORE INSERT OR UPDATE OF ecd_id, child_id, status, monthly_fee_cents
  ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.applications_sync_monthly_fee_from_age_group_pricing();
