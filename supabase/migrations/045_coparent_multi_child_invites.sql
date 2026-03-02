BEGIN;

-- Allow one secure invite token to cover multiple guardian rows (multiple children).
ALTER TABLE public.guardians
  DROP CONSTRAINT IF EXISTS guardians_invite_token_key;

-- Keep token lookups fast for /join and accept endpoints.
CREATE INDEX IF NOT EXISTS idx_guardians_invite_token
  ON public.guardians(invite_token)
  WHERE invite_token IS NOT NULL;

-- Speed up contact-based fan-out invite generation for pending co-parent rows.
CREATE INDEX IF NOT EXISTS idx_guardians_parent_contact_pending
  ON public.guardians(parent_id, linked_user_id, email, phone);

COMMIT;

