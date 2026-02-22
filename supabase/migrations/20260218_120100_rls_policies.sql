-- RLS helper functions + policies for newly added modules

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_ecd_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ea.ecd_id
  FROM public.ecd_admins ea
  WHERE ea.user_id = auth.uid()
  ORDER BY ea.invited_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.auth_role() = 'platform_admin', FALSE)
$$;

CREATE OR REPLACE FUNCTION public.is_ecd_admin(centre_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ecd_admins ea
    WHERE ea.user_id = auth.uid()
      AND ea.ecd_id = centre_id
      AND ea.role = 'ecd_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_ecd_member(centre_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ecd_admins ea
    WHERE ea.user_id = auth.uid()
      AND ea.ecd_id = centre_id
      AND ea.role IN ('ecd_admin', 'ecd_staff')
  )
$$;

-- Atomic accept-offer RPC used by server actions.
CREATE OR REPLACE FUNCTION public.accept_offer_atomic(p_application_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_app RECORD;
BEGIN
  SELECT id, parent_id, child_id, ecd_id, status
  INTO v_app
  FROM public.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_app.status <> 'approved' THEN
    RAISE EXCEPTION 'Offer is not available for acceptance';
  END IF;

  UPDATE public.applications
  SET status = 'enrolled',
      offer_accepted_at = v_now,
      enrolled_at = v_now,
      decided_at = COALESCE(decided_at, v_now),
      updated_at = v_now
  WHERE id = v_app.id;

  UPDATE public.applications
  SET status = 'withdrawn',
      withdrawn_at = v_now,
      withdraw_reason = 'auto_after_enroll',
      decided_at = COALESCE(decided_at, v_now),
      updated_at = v_now
  WHERE parent_id = v_app.parent_id
    AND child_id = v_app.child_id
    AND id <> v_app.id
    AND status IN ('submitted', 'in_review', 'approved', 'waitlisted');

  INSERT INTO public.notifications (user_id, ecd_id, type, title, body, data)
  VALUES (
    v_app.parent_id,
    v_app.ecd_id,
    'application_offer_accepted',
    'Offer accepted',
    'You accepted the offer and enrollment is now confirmed.',
    jsonb_build_object('application_id', v_app.id)
  );

  INSERT INTO public.notifications (user_id, ecd_id, type, title, body, data)
  SELECT
    ea.user_id,
    v_app.ecd_id,
    'application_offer_accepted',
    'Parent accepted offer',
    'A parent accepted an offer for enrollment.',
    jsonb_build_object('application_id', v_app.id)
  FROM public.ecd_admins ea
  WHERE ea.ecd_id = v_app.ecd_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_offer_atomic(UUID) TO authenticated;

-- ============================================================
-- ENABLE RLS ON NEW TABLES
-- ============================================================
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Existing table, now has new audience fields.
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- GUARDIANS
-- ============================================================
DROP POLICY IF EXISTS "parent_own_guardians" ON public.guardians;
DROP POLICY IF EXISTS "ecd_see_guardians" ON public.guardians;

CREATE POLICY "parent_own_guardians" ON public.guardians
  FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "ecd_see_guardians" ON public.guardians
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.child_id = guardians.child_id
        AND public.is_ecd_member(a.ecd_id)
    )
  );

-- ============================================================
-- ATTENDANCE
-- ============================================================
DROP POLICY IF EXISTS "ecd_manage_attendance" ON public.attendance;
DROP POLICY IF EXISTS "parent_see_own_child_attendance" ON public.attendance;

CREATE POLICY "ecd_manage_attendance" ON public.attendance
  FOR ALL
  USING (public.is_ecd_member(ecd_id))
  WITH CHECK (public.is_ecd_member(ecd_id));

CREATE POLICY "parent_see_own_child_attendance" ON public.attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.children c
      WHERE c.id = attendance.child_id
        AND c.parent_id = auth.uid()
    )
  );

-- ============================================================
-- PICKUP CODES
-- ============================================================
DROP POLICY IF EXISTS "parent_own_pickup_codes" ON public.pickup_codes;
DROP POLICY IF EXISTS "ecd_see_pickup_codes" ON public.pickup_codes;
DROP POLICY IF EXISTS "ecd_create_pickup_codes" ON public.pickup_codes;
DROP POLICY IF EXISTS "ecd_update_pickup_codes" ON public.pickup_codes;

CREATE POLICY "parent_own_pickup_codes" ON public.pickup_codes
  FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "ecd_see_pickup_codes" ON public.pickup_codes
  FOR SELECT
  USING (public.is_ecd_member(ecd_id));

CREATE POLICY "ecd_create_pickup_codes" ON public.pickup_codes
  FOR INSERT
  WITH CHECK (public.is_ecd_member(ecd_id));

CREATE POLICY "ecd_update_pickup_codes" ON public.pickup_codes
  FOR UPDATE
  USING (public.is_ecd_member(ecd_id))
  WITH CHECK (public.is_ecd_member(ecd_id));

-- ============================================================
-- PICKUP AUDIT LOG
-- ============================================================
DROP POLICY IF EXISTS "ecd_see_audit_log" ON public.pickup_audit_log;
DROP POLICY IF EXISTS "insert_audit_log_authenticated" ON public.pickup_audit_log;

CREATE POLICY "ecd_see_audit_log" ON public.pickup_audit_log
  FOR SELECT
  USING (public.is_ecd_member(ecd_id));

CREATE POLICY "insert_audit_log_authenticated" ON public.pickup_audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- ANNOUNCEMENTS / READS
-- ============================================================
DROP POLICY IF EXISTS "parent_see_announcements_by_audience" ON public.announcements;
DROP POLICY IF EXISTS "parent_own_reads" ON public.announcement_reads;

CREATE POLICY "parent_see_announcements_by_audience" ON public.announcements
  FOR SELECT
  USING (
    is_published = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.ecd_id = announcements.ecd_id
        AND a.parent_id = auth.uid()
        AND a.status IN ('approved', 'enrolled')
    )
  );

CREATE POLICY "parent_own_reads" ON public.announcement_reads
  FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- ============================================================
-- MESSAGE THREADS / MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "participant_see_threads" ON public.message_threads;
DROP POLICY IF EXISTS "ecd_create_threads" ON public.message_threads;
DROP POLICY IF EXISTS "parent_create_threads" ON public.message_threads;

CREATE POLICY "participant_see_threads" ON public.message_threads
  FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "ecd_create_threads" ON public.message_threads
  FOR INSERT
  WITH CHECK (public.is_ecd_member(ecd_id));

CREATE POLICY "parent_create_threads" ON public.message_threads
  FOR INSERT
  WITH CHECK (
    auth.uid() = ANY(participant_ids)
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.ecd_id = message_threads.ecd_id
        AND a.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "participant_see_messages" ON public.messages;
DROP POLICY IF EXISTS "participant_send_messages" ON public.messages;

CREATE POLICY "participant_see_messages" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND auth.uid() = ANY(mt.participant_ids)
    )
  );

CREATE POLICY "participant_send_messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND auth.uid() = ANY(mt.participant_ids)
    )
  );

-- ============================================================
-- JOBS / JOB APPLICATIONS
-- ============================================================
DROP POLICY IF EXISTS "public_see_published_jobs" ON public.jobs;
DROP POLICY IF EXISTS "ecd_admin_manage_jobs" ON public.jobs;
DROP POLICY IF EXISTS "ecd_staff_see_jobs" ON public.jobs;

CREATE POLICY "public_see_published_jobs" ON public.jobs
  FOR SELECT
  USING (is_published = TRUE OR public.is_ecd_member(ecd_id) OR public.is_platform_admin());

CREATE POLICY "ecd_admin_manage_jobs" ON public.jobs
  FOR ALL
  USING (public.is_ecd_admin(ecd_id))
  WITH CHECK (public.is_ecd_admin(ecd_id));

CREATE POLICY "ecd_staff_see_jobs" ON public.jobs
  FOR SELECT
  USING (public.is_ecd_member(ecd_id));

DROP POLICY IF EXISTS "ecd_see_job_applications" ON public.job_applications;
DROP POLICY IF EXISTS "ecd_update_job_applications" ON public.job_applications;
DROP POLICY IF EXISTS "ecd_admin_manage_job_applications" ON public.job_applications;
DROP POLICY IF EXISTS "public_apply_for_job" ON public.job_applications;

CREATE POLICY "ecd_see_job_applications" ON public.job_applications
  FOR SELECT
  USING (public.is_ecd_member(ecd_id));

CREATE POLICY "ecd_update_job_applications" ON public.job_applications
  FOR UPDATE
  USING (public.is_ecd_member(ecd_id))
  WITH CHECK (public.is_ecd_member(ecd_id));

CREATE POLICY "ecd_admin_manage_job_applications" ON public.job_applications
  FOR ALL
  USING (public.is_ecd_admin(ecd_id))
  WITH CHECK (public.is_ecd_admin(ecd_id));

CREATE POLICY "public_apply_for_job" ON public.job_applications
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
DROP POLICY IF EXISTS "own_notifications" ON public.notifications;

CREATE POLICY "own_notifications" ON public.notifications
  FOR ALL
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

