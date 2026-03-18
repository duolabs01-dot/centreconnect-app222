-- Allow multiple sessions per user for ECD Admin device limit enforcement
-- Drop the old unique constraint and add a composite constraint for device-level uniqueness
ALTER TABLE public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_key;

-- Add a device fingerprint column for better deduplication per device
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_created_at ON public.user_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_device ON public.user_sessions(user_id, device_fingerprint);

-- Update RLS policies to support multiple rows per user
DROP POLICY IF EXISTS "users own sessions" ON public.user_sessions;
CREATE POLICY "users own sessions" ON public.user_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON COLUMN public.user_sessions.device_fingerprint IS 'Hashed fingerprint of device+browser to deduplicate per device';
