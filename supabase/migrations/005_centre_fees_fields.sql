-- Centre fee transparency fields for parent-facing UI and ECD editing.

ALTER TABLE ecd_centres
  ADD COLUMN IF NOT EXISTS fees_display_mode TEXT NOT NULL DEFAULT 'range'
    CHECK (fees_display_mode IN ('exact', 'range', 'contact')),
  ADD COLUMN IF NOT EXISTS monthly_fee_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monthly_fee_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS subsidy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fees_notes TEXT,
  ADD COLUMN IF NOT EXISTS fees_last_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

UPDATE ecd_centres
SET contact_phone = COALESCE(contact_phone, phone)
WHERE contact_phone IS NULL;

CREATE OR REPLACE SECURITY DEFINER VIEW public_ecd_centres
AS
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
FROM ecd_centres
WHERE is_active = true;

GRANT SELECT ON public_ecd_centres TO anon, authenticated;
