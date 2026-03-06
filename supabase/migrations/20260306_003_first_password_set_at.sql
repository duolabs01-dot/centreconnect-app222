-- Track first successful password setup for onboarding gating.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS first_password_set_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_profiles_first_password_set_at
  ON public.user_profiles(first_password_set_at);
