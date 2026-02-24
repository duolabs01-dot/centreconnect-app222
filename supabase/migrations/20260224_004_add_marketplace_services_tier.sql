BEGIN;

ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS tier public.subscription_tier;

COMMENT ON COLUMN public.marketplace_services.tier IS
  'Recommended subscription tier for this add-on service (basic, standard, premium).';

CREATE INDEX IF NOT EXISTS idx_marketplace_services_tier_active
  ON public.marketplace_services (tier)
  WHERE is_active = TRUE;

COMMIT;
