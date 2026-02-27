-- Tables for referral program (codes and credits)

-- referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE CASCADE, -- Who owns this code (optional, platform-wide or centre-specific)
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0
);

-- RLS for referral_codes
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_codes_admin_full_access" ON referral_codes;
DROP POLICY IF EXISTS "referral_codes_ecd_select_own" ON referral_codes;

CREATE POLICY "referral_codes_admin_full_access" ON referral_codes
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "referral_codes_ecd_select_own" ON referral_codes
  FOR SELECT
  USING (ecd_id IN (SELECT get_user_ecd_ids()));

-- referral_credits table
CREATE TABLE IF NOT EXISTS referral_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'applied', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  notes TEXT
);

-- RLS for referral_credits
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_credits_admin_full_access" ON referral_credits;
DROP POLICY IF EXISTS "referral_credits_user_select_own" ON referral_credits;

CREATE POLICY "referral_credits_admin_full_access" ON referral_credits
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "referral_credits_user_select_own" ON referral_credits
  FOR SELECT
  USING (user_id = auth.uid());

