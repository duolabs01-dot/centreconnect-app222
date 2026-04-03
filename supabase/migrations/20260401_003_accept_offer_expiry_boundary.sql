-- Fix offer-expiry boundary mismatch in accept_offer_atomic.
--
-- Migration 20260401_002 used:   offer_expires_at < v_now  (strict less-than)
-- UI and server action use:      offer_expires_at <= Date.now()  (less-than-or-equal)
--
-- An offer whose expiry timestamp equals NOW() exactly would be blocked by the
-- UI/server but allowed through by the RPC, creating a split-truth window.
--
-- This migration aligns the DB check to <= so all three layers agree:
-- "at or past expiry" means expired.

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
  SELECT id, parent_id, child_id, ecd_id, status, offer_expires_at
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

  -- Block acceptance when at or past the expiry timestamp (consistent with UI and server action)
  IF v_app.offer_expires_at IS NOT NULL AND v_app.offer_expires_at <= v_now THEN
    RAISE EXCEPTION 'Offer has expired';
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
