-- Table for bookkeeping assignments

CREATE TABLE IF NOT EXISTS bookkeeping_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  service_application_id UUID NOT NULL REFERENCES public.ecd_service_applications(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- User ID of the bookkeeper
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'in_progress', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for bookkeeping_assignments: platform_admin only
ALTER TABLE bookkeeping_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookkeeping_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookkeeping_assignments_platform_admin_full_access" ON bookkeeping_assignments;

CREATE POLICY "bookkeeping_assignments_platform_admin_full_access" ON bookkeeping_assignments
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Updated_at trigger (if not already handled globally)
CREATE TRIGGER update_bookkeeping_assignments_updated_at BEFORE UPDATE ON bookkeeping_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
