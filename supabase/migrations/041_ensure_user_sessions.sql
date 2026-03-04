-- supabase/migrations/041_ensure_user_sessions.sql
CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  device_hint text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ip_address text,
  region text,
  user_agent text,
  last_seen_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own sessions" ON public.user_sessions;
CREATE POLICY "users own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);
