-- Track claimed centres using an explicit owner user id.
-- Disclaimer visibility and claim CTA now rely on owner_id being NULL/non-NULL.

ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ecd_centres_owner_id
  ON public.ecd_centres(owner_id);

WITH ranked_claims AS (
  SELECT
    ea.ecd_id,
    ea.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY ea.ecd_id
      ORDER BY COALESCE(ea.accepted_at, ea.invited_at) DESC
    ) AS rank_order
  FROM public.ecd_admins ea
  WHERE ea.accepted_at IS NOT NULL
)
UPDATE public.ecd_centres c
SET owner_id = ranked_claims.user_id
FROM ranked_claims
WHERE c.id = ranked_claims.ecd_id
  AND ranked_claims.rank_order = 1
  AND c.owner_id IS NULL;
