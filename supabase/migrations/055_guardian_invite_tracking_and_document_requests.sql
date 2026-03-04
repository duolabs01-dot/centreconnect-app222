BEGIN;

-- Track co-parent invite lifecycle events so ECD staff can see link progress.
ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS invite_link_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_link_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_claimed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_guardians_invite_lifecycle
  ON public.guardians(invite_sent_at, invite_link_viewed_at, invite_claimed_at);

-- Parent-to-parent document request workflow for linked child profiles.
CREATE TABLE IF NOT EXISTS public.child_document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  requested_for_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  requested_by_guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  requested_for_guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  requested_by_label TEXT,
  requested_for_label TEXT,
  document_codes TEXT[] NOT NULL DEFAULT '{}'::text[],
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'acknowledged', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_child_document_requests_ecd
  ON public.child_document_requests(ecd_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_child_document_requests_application
  ON public.child_document_requests(application_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_child_document_requests_child
  ON public.child_document_requests(child_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_child_document_requests_target
  ON public.child_document_requests(requested_for_user_id, requested_at DESC);

ALTER TABLE public.child_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_document_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "child_document_requests_ecd_all" ON public.child_document_requests;
DROP POLICY IF EXISTS "child_document_requests_linked_read" ON public.child_document_requests;
DROP POLICY IF EXISTS "child_document_requests_linked_update" ON public.child_document_requests;
DROP POLICY IF EXISTS "child_document_requests_platform_all" ON public.child_document_requests;

CREATE POLICY "child_document_requests_ecd_all" ON public.child_document_requests
  FOR ALL
  USING (ecd_id IN (SELECT get_user_ecd_ids()))
  WITH CHECK (ecd_id IN (SELECT get_user_ecd_ids()));

CREATE POLICY "child_document_requests_linked_read" ON public.child_document_requests
  FOR SELECT
  USING (
    requested_by_user_id = auth.uid()
    OR requested_for_user_id = auth.uid()
  );

CREATE POLICY "child_document_requests_linked_update" ON public.child_document_requests
  FOR UPDATE
  USING (
    requested_by_user_id = auth.uid()
    OR requested_for_user_id = auth.uid()
  )
  WITH CHECK (
    requested_by_user_id = auth.uid()
    OR requested_for_user_id = auth.uid()
  );

CREATE POLICY "child_document_requests_platform_all" ON public.child_document_requests
  FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

COMMIT;
