-- Migration: 20260329_002_ecd_centres_is_real_partner
-- Adds is_real_partner to ecd_centres so the Founder Advisor can query
-- which centres are real business partners from the DB rather than relying
-- on hardcoded names in application code.
--
-- When set to TRUE on a centre, the Founder Advisor will include that centre
-- in its canonical business truth (pilot partner count, partner-level context).
-- All other centres are treated as demo/test records for advisory purposes.
--
-- Starting value: FALSE for all centres.
-- Backfill: TRUE for the two known pilot partners (by slug).
--
-- Extending the list: set is_real_partner = TRUE on the new centre row in
-- Supabase. No code change or redeployment is needed.

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS is_real_partner BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: the two pilot partners confirmed as real business partners
UPDATE public.ecd_centres
SET is_real_partner = TRUE
WHERE slug IN (
  'bajabulile-day-care-centre',
  'sakhisizwe-day-care-centre'
);

-- Partial index — only non-default rows (real partners are a small set)
CREATE INDEX IF NOT EXISTS idx_ecd_centres_is_real_partner
  ON public.ecd_centres (id)
  WHERE is_real_partner = TRUE;

COMMENT ON COLUMN public.ecd_centres.is_real_partner IS
  'TRUE for real business partner centres. Used by the Founder Advisor to separate genuine pipeline from demo/test rows. Set in Supabase when a new real partner is onboarded — no code change required.';
