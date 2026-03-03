-- Fix accept_offer_atomic auto-withdraw reason to align with applications_withdraw_reason_chk
-- and parent-side counters that expect auto_after_accept.

BEGIN;

-- Normalize any legacy values that may have been written in permissive environments.
UPDATE public.applications
SET withdraw_reason = 'auto_after_accept'
WHERE withdraw_reason = 'auto_after_enroll';

-- Ensure the constraint allows only supported values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_withdraw_reason_chk'
  ) THEN
    ALTER TABLE public.applications
      DROP CONSTRAINT applications_withdraw_reason_chk;
  END IF;

  ALTER TABLE public.applications
    ADD CONSTRAINT applications_withdraw_reason_chk
    CHECK (
      withdraw_reason IS NULL
      OR withdraw_reason IN ('auto_after_accept', 'parent_manual', 'centre_closed')
    );
END;
$$;

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
      withdraw_reason = 'auto_after_accept',
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

COMMIT;

