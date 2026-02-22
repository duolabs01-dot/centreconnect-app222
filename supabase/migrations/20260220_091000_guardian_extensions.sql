BEGIN;

ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS import_source TEXT
    CHECK (import_source IN ('manual','device_contacts','whatsapp')),
  ADD COLUMN IF NOT EXISTS relationship TEXT,
  ADD COLUMN IF NOT EXISTS can_pickup BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_view_applications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_receive_announcements BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_generate_pickup_code BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guardians'
      AND policyname = 'cogardian_read_own_record'
  ) THEN
    CREATE POLICY "cogardian_read_own_record" ON public.guardians
      FOR SELECT
      USING (linked_user_id = auth.uid());
  END IF;
END$$;

COMMIT;
