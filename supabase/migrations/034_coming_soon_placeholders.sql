-- Table to track user interest in upcoming features.

CREATE TABLE IF NOT EXISTS feature_interest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_name TEXT NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE SET NULL,
  email TEXT, -- Capture email if user is not logged in or for updates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- RLS for feature_interest: public insert, platform_admin full access
ALTER TABLE feature_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_interest FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_interest_platform_admin_full_access" ON feature_interest;
DROP POLICY IF EXISTS "feature_interest_anon_can_insert" ON feature_interest;
DROP POLICY IF EXISTS "feature_interest_user_can_insert" ON feature_interest;

CREATE POLICY "feature_interest_platform_admin_full_access" ON feature_interest
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Allow any authenticated user to insert, including anonymous if `email` is provided
CREATE POLICY "feature_interest_anon_can_insert" ON feature_interest
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND email IS NOT NULL);

CREATE POLICY "feature_interest_user_can_insert" ON feature_interest
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
