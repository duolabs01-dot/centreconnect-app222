-- App-wide performance boost: common indexes + admissions counts RPC.

CREATE INDEX IF NOT EXISTS idx_ecd_admins_user_invited_desc
  ON public.ecd_admins(user_id, invited_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_ecd_status_created
  ON public.support_tickets(ecd_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_ecd_public_date
  ON public.calendar_events(ecd_id, is_public, event_date ASC);

CREATE INDEX IF NOT EXISTS idx_jobs_ecd_published_desc
  ON public.jobs(ecd_id, is_published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_public_published_desc
  ON public.jobs(is_published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_templates_active_key_created
  ON public.communication_templates(is_active, template_key, created_at ASC);

CREATE OR REPLACE FUNCTION public.get_ecd_application_counts(p_ecd_id UUID)
RETURNS TABLE (
  submitted_count BIGINT,
  in_review_count BIGINT,
  pending_count BIGINT,
  approved_count BIGINT,
  awaiting_offer_response_count BIGINT,
  enrolled_count BIGINT,
  waitlisted_count BIGINT,
  rejected_count BIGINT
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
  SELECT
    COUNT(*) FILTER (WHERE a.status = 'submitted')::BIGINT AS submitted_count,
    COUNT(*) FILTER (WHERE a.status = 'in_review')::BIGINT AS in_review_count,
    COUNT(*) FILTER (WHERE a.status IN ('submitted', 'in_review'))::BIGINT AS pending_count,
    COUNT(*) FILTER (WHERE a.status = 'approved')::BIGINT AS approved_count,
    COUNT(*) FILTER (WHERE a.status = 'approved' AND a.offer_accepted_at IS NULL)::BIGINT AS awaiting_offer_response_count,
    COUNT(*) FILTER (WHERE a.status = 'enrolled')::BIGINT AS enrolled_count,
    COUNT(*) FILTER (WHERE a.status = 'waitlisted')::BIGINT AS waitlisted_count,
    COUNT(*) FILTER (WHERE a.status = 'rejected')::BIGINT AS rejected_count
  FROM public.applications a
  WHERE a.ecd_id = p_ecd_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ecd_application_counts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ecd_application_counts(UUID) TO authenticated;
