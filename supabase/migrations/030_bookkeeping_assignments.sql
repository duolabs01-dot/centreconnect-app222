-- Table for bookkeeping human workflow assignments
-- This migration ensures platform admins can track and assign bookkeeping requests.

CREATE TABLE IF NOT EXISTS public.bookkeeping_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  service_application_id UUID REFERENCES public.ecd_service_applications(id) ON DELETE CASCADE, -- Nullable for marketplace orders
  assigned_to_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- User ID of the internal bookkeeper
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'awaiting_docs', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: platform_admin only for internal workflow
ALTER TABLE public.bookkeeping_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookkeeping_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookkeeping_assignments_platform_admin_all" ON public.bookkeeping_assignments;
CREATE POLICY "bookkeeping_assignments_platform_admin_all" ON public.bookkeeping_assignments
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_bookkeeping_assignments_status ON public.bookkeeping_assignments(status);
CREATE INDEX IF NOT EXISTS idx_bookkeeping_assignments_ecd ON public.bookkeeping_assignments(ecd_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bookkeeping_assignments_updated_at ON public.bookkeeping_assignments;
CREATE TRIGGER update_bookkeeping_assignments_updated_at 
BEFORE UPDATE ON public.bookkeeping_assignments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
