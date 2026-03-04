-- Dashboard performance: single RPC snapshot + targeted indexes.

CREATE INDEX IF NOT EXISTS idx_applications_ecd_status_submitted
  ON public.applications(ecd_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_ecd_submitted_desc
  ON public.applications(ecd_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_ecd_date_pickup
  ON public.attendance(ecd_id, date DESC, picked_up);

CREATE INDEX IF NOT EXISTS idx_pickup_codes_ecd_open
  ON public.pickup_codes(ecd_id, used, locked)
  WHERE used = false AND locked = false;

CREATE INDEX IF NOT EXISTS idx_guardians_child_verified
  ON public.guardians(child_id, is_verified);

CREATE OR REPLACE FUNCTION public.get_ecd_dashboard_snapshot(
  p_ecd_id UUID,
  p_today DATE DEFAULT (timezone('Africa/Johannesburg', now())::date)
)
RETURNS TABLE (
  submitted_count BIGINT,
  in_review_count BIGINT,
  waitlisted_count BIGINT,
  attendance_today_count BIGINT,
  picked_up_today_count BIGINT,
  active_pickup_codes_count BIGINT,
  admissions_current_7_count BIGINT,
  admissions_previous_7_count BIGINT,
  attendance_current_7_count BIGINT,
  attendance_previous_7_count BIGINT,
  unverified_guardians_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_platform_admin() OR user_is_ecd_admin(p_ecd_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH child_scope AS (
    SELECT DISTINCT a.child_id
    FROM public.applications a
    WHERE a.ecd_id = p_ecd_id
      AND a.child_id IS NOT NULL
  )
  SELECT
    (SELECT COUNT(*) FROM public.applications a WHERE a.ecd_id = p_ecd_id AND a.status = 'submitted')::BIGINT,
    (SELECT COUNT(*) FROM public.applications a WHERE a.ecd_id = p_ecd_id AND a.status = 'in_review')::BIGINT,
    (SELECT COUNT(*) FROM public.applications a WHERE a.ecd_id = p_ecd_id AND a.status = 'waitlisted')::BIGINT,
    (SELECT COUNT(*) FROM public.attendance t WHERE t.ecd_id = p_ecd_id AND t.date = p_today)::BIGINT,
    (SELECT COUNT(*) FROM public.attendance t WHERE t.ecd_id = p_ecd_id AND t.date = p_today AND t.picked_up = true)::BIGINT,
    (SELECT COUNT(*) FROM public.pickup_codes c WHERE c.ecd_id = p_ecd_id AND c.used = false AND c.locked = false)::BIGINT,
    (SELECT COUNT(*) FROM public.applications a WHERE a.ecd_id = p_ecd_id AND a.submitted_at >= (p_today - INTERVAL '6 days'))::BIGINT,
    (SELECT COUNT(*) FROM public.applications a WHERE a.ecd_id = p_ecd_id AND a.submitted_at >= (p_today - INTERVAL '13 days') AND a.submitted_at < (p_today - INTERVAL '6 days'))::BIGINT,
    (SELECT COUNT(*) FROM public.attendance t WHERE t.ecd_id = p_ecd_id AND t.date >= (p_today - INTERVAL '6 days')::DATE)::BIGINT,
    (SELECT COUNT(*) FROM public.attendance t WHERE t.ecd_id = p_ecd_id AND t.date >= (p_today - INTERVAL '13 days')::DATE AND t.date < (p_today - INTERVAL '6 days')::DATE)::BIGINT,
    (
      SELECT COUNT(*)
      FROM public.guardians g
      WHERE g.is_verified = false
        AND g.child_id IN (SELECT child_id FROM child_scope)
    )::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ecd_dashboard_snapshot(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ecd_dashboard_snapshot(UUID, DATE) TO authenticated;
