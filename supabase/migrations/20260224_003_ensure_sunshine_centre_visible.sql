BEGIN;

-- Ensure the canonical Sunshine centre is visible in parent discovery/search.
UPDATE public.ecd_centres
SET
  name = 'Sunshine Early Learning Centre',
  is_active = TRUE,
  website_published = TRUE,
  website_published_at = COALESCE(website_published_at, NOW())
WHERE slug = 'sunshine-early-learning'
   OR LOWER(name) = 'sunshine early learning centre';

INSERT INTO public.ecd_centres (
  slug,
  name,
  tagline,
  description,
  email,
  phone,
  address,
  suburb,
  city,
  province,
  is_active,
  website_published,
  website_published_at,
  is_registered,
  age_groups,
  fees_display_mode,
  monthly_fee_min,
  monthly_fee_max,
  subsidy_accepted,
  capacity
)
SELECT
  'sunshine-early-learning',
  'Sunshine Early Learning Centre',
  'Safe care and joyful learning every day.',
  'Sunshine Early Learning Centre provides nurturing early childhood care with play-based learning and school readiness support.',
  'info@sunshine-elc.co.za',
  '+27 10 123 4567',
  '123 Main Road',
  'Alexandra',
  'Johannesburg',
  'Gauteng',
  TRUE,
  TRUE,
  NOW(),
  TRUE,
  ARRAY['2-3', '3-4', '4-5', '5-6']::TEXT[],
  'range',
  1200,
  1800,
  TRUE,
  60
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ecd_centres c
  WHERE c.slug = 'sunshine-early-learning'
     OR LOWER(c.name) = 'sunshine early learning centre'
);

COMMIT;
