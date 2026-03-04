-- Table for storing Web Push API subscriptions.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE, -- Optional: Link to user profile
  ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE CASCADE, -- Optional: Link to ECD centre if subscription is for centre owner
  subscription JSONB NOT NULL, -- Web Push Subscription object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_ecd_id ON push_subscriptions(ecd_id);

-- RLS:
-- Users can manage their own subscriptions
-- Platform admins have full access
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_platform_admin_full_access" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_user_manage_own" ON push_subscriptions;

CREATE POLICY "push_subscriptions_platform_admin_full_access" ON push_subscriptions
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "push_subscriptions_user_manage_own" ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
