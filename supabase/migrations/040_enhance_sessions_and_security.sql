-- supabase/migrations/040_enhance_sessions_and_security.sql
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.parent_security_events
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;
