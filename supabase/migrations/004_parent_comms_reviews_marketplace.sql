-- Phase 2 foundations:
-- 1) Parent <-> Centre direct messaging
-- 2) Reviews and ratings from verified parents
-- 3) Marketplace services and purchases for ECD centres

-- -------------------------------------------------------------------
-- Parent/Centre Messages
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parent_centre_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('parent', 'ecd')),
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_messages_parent ON parent_centre_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_ecd ON parent_centre_messages(ecd_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_created ON parent_centre_messages(created_at DESC);

ALTER TABLE parent_centre_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_centre_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_messages_select_strict" ON parent_centre_messages;
DROP POLICY IF EXISTS "parent_messages_insert_strict" ON parent_centre_messages;
DROP POLICY IF EXISTS "parent_messages_update_strict" ON parent_centre_messages;
DROP POLICY IF EXISTS "parent_messages_delete_platform_only" ON parent_centre_messages;

CREATE POLICY "parent_messages_select_strict" ON parent_centre_messages
  FOR SELECT
  USING (
    is_platform_admin()
    OR parent_id = auth.uid()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "parent_messages_insert_strict" ON parent_centre_messages
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (parent_id = auth.uid() AND sender_role = 'parent')
    OR (user_is_ecd_admin(ecd_id) AND sender_role = 'ecd')
  );

CREATE POLICY "parent_messages_update_strict" ON parent_centre_messages
  FOR UPDATE
  USING (
    is_platform_admin()
    OR parent_id = auth.uid()
    OR user_is_ecd_admin(ecd_id)
  )
  WITH CHECK (
    is_platform_admin()
    OR parent_id = auth.uid()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "parent_messages_delete_platform_only" ON parent_centre_messages
  FOR DELETE
  USING (is_platform_admin());

-- -------------------------------------------------------------------
-- Reviews
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, ecd_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_ecd ON reviews(ecd_id);
CREATE INDEX IF NOT EXISTS idx_reviews_parent ON reviews(parent_id);

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION parent_can_review(target_ecd_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM applications a
    WHERE a.parent_id = auth.uid()
      AND a.ecd_id = target_ecd_id
      AND a.status = 'approved'
  );
$$;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_verified" ON reviews;
DROP POLICY IF EXISTS "reviews_update_owner" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_owner_or_platform" ON reviews;

CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert_verified" ON reviews
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (parent_id = auth.uid() AND parent_can_review(ecd_id))
  );

CREATE POLICY "reviews_update_owner" ON reviews
  FOR UPDATE
  USING (
    is_platform_admin()
    OR parent_id = auth.uid()
  )
  WITH CHECK (
    is_platform_admin()
    OR parent_id = auth.uid()
  );

CREATE POLICY "reviews_delete_owner_or_platform" ON reviews
  FOR DELETE
  USING (
    is_platform_admin()
    OR parent_id = auth.uid()
  );

-- -------------------------------------------------------------------
-- Marketplace
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecd_marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES marketplace_services(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'paid', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_ecd ON ecd_marketplace_orders(ecd_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON ecd_marketplace_orders(status);

ALTER TABLE marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_services FORCE ROW LEVEL SECURITY;

ALTER TABLE ecd_marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_marketplace_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_services_select_all" ON marketplace_services;
DROP POLICY IF EXISTS "marketplace_services_write_platform_only" ON marketplace_services;
DROP POLICY IF EXISTS "marketplace_orders_select_strict" ON ecd_marketplace_orders;
DROP POLICY IF EXISTS "marketplace_orders_insert_strict" ON ecd_marketplace_orders;
DROP POLICY IF EXISTS "marketplace_orders_update_platform_only" ON ecd_marketplace_orders;
DROP POLICY IF EXISTS "marketplace_orders_delete_platform_only" ON ecd_marketplace_orders;

CREATE POLICY "marketplace_services_select_all" ON marketplace_services
  FOR SELECT
  USING (true);

CREATE POLICY "marketplace_services_write_platform_only" ON marketplace_services
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "marketplace_orders_select_strict" ON ecd_marketplace_orders
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

CREATE POLICY "marketplace_orders_insert_strict" ON ecd_marketplace_orders
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (user_is_ecd_admin(ecd_id) AND requested_by = auth.uid())
  );

CREATE POLICY "marketplace_orders_update_platform_only" ON ecd_marketplace_orders
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "marketplace_orders_delete_platform_only" ON ecd_marketplace_orders
  FOR DELETE
  USING (is_platform_admin());
