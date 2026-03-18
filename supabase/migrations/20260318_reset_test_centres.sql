-- Reset test/demo centres back to an unclaimed state.
-- PRESERVES: Bajabulile ECD, Sakhisizwe ECD, Sunshine Early Learning.
-- REVIEW BEFORE EXECUTION: this migration is intentionally created but not applied in this sprint.

-- Step 1: Deactivate non-pilot centres and clear owner claims.
UPDATE public.ecd_centres
SET
  is_active = false,
  owner_id = null
WHERE
  name NOT ILIKE '%bajabulile%'
  AND name NOT ILIKE '%sakhisizwe%'
  AND name NOT ILIKE '%sunshine%'
  AND (owner_id IS NOT NULL OR is_active = true);

-- Step 2: Cancel trial or active subscriptions for non-pilot centres.
UPDATE public.subscriptions
SET status = 'canceled'
WHERE
  ecd_id NOT IN (
    SELECT id
    FROM public.ecd_centres
    WHERE name ILIKE '%bajabulile%'
      OR name ILIKE '%sakhisizwe%'
      OR name ILIKE '%sunshine%'
  )
  AND status IN ('trial', 'active');

-- Step 3: Revoke accepted ECD admin invitations for non-pilot centres so they are no longer treated as claimed.
UPDATE public.ecd_admin_invitations
SET accepted_at = null
WHERE
  role = 'ecd_admin'
  AND ecd_id NOT IN (
    SELECT id
    FROM public.ecd_centres
    WHERE name ILIKE '%bajabulile%'
      OR name ILIKE '%sakhisizwe%'
      OR name ILIKE '%sunshine%'
  )
  AND accepted_at IS NOT NULL;