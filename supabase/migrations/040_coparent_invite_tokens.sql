BEGIN;

-- Add invite token to guardians table
ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS guardians_invite_token_idx ON public.guardians (invite_token)
  WHERE invite_token IS NOT NULL;

-- Policy: anyone with the token can read the guardian row to accept
-- (they are not yet authenticated as a user â€” they are registering)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'guardians' AND policyname = 'guardian_accept_by_token'
  ) THEN
    CREATE POLICY "guardian_accept_by_token" ON public.guardians
      FOR SELECT
      USING (
        invite_token IS NOT NULL
        AND invite_token_expires_at > now()
      );
  END IF;
END$$;

COMMIT;
