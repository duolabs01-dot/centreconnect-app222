ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS account_activation_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activation_reason TEXT,
  ADD COLUMN IF NOT EXISTS activation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activation_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_account_activation_required
  ON public.user_profiles(account_activation_required)
  WHERE account_activation_required = true;

CREATE TABLE IF NOT EXISTS public.user_role_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  from_role user_role,
  to_role user_role NOT NULL,
  triggered_by UUID REFERENCES public.user_profiles(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'expired', 'cancelled')),
  activation_link_sent_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_role_transitions_user_status
  ON public.user_role_transitions(user_id, status, created_at DESC);

DROP TRIGGER IF EXISTS update_user_role_transitions_updated_at ON public.user_role_transitions;
CREATE TRIGGER update_user_role_transitions_updated_at
  BEFORE UPDATE ON public.user_role_transitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.user_role_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_transitions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_role_transitions_select_own" ON public.user_role_transitions;
CREATE POLICY "user_role_transitions_select_own"
  ON public.user_role_transitions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_role_transitions_platform_admin_full" ON public.user_role_transitions;
CREATE POLICY "user_role_transitions_platform_admin_full"
  ON public.user_role_transitions
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
