-- Real offer system with pricing breakdown, legal agreement payload,
-- and explicit rejection reasons for parent visibility.

BEGIN;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS offer_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS offer_conditions TEXT,
  ADD COLUMN IF NOT EXISTS offer_penalties TEXT,
  ADD COLUMN IF NOT EXISTS offer_legal_agreement TEXT,
  ADD COLUMN IF NOT EXISTS offer_legal_version TEXT,
  ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_sent_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason_note TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.applications
  ALTER COLUMN offer_legal_version SET DEFAULT 'sa-parent-v1';

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_offer_breakdown_array_chk;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_offer_breakdown_array_chk
  CHECK (jsonb_typeof(offer_breakdown) = 'array');

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_rejection_reason_required_chk;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_rejection_reason_required_chk
  CHECK (
    status <> 'rejected'
    OR (rejection_reason_code IS NOT NULL AND btrim(rejection_reason_code) <> '')
  );

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_rejection_other_note_chk;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_rejection_other_note_chk
  CHECK (
    status <> 'rejected'
    OR rejection_reason_code <> 'other'
    OR (rejection_reason_note IS NOT NULL AND btrim(rejection_reason_note) <> '')
  );

CREATE INDEX IF NOT EXISTS idx_applications_offer_expires_at
  ON public.applications(offer_expires_at)
  WHERE offer_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_rejection_reason_code
  ON public.applications(rejection_reason_code)
  WHERE status = 'rejected';

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

  IF v_app.offer_expires_at IS NOT NULL AND v_app.offer_expires_at < v_now THEN
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
      withdraw_reason = 'auto_after_accept',
      decided_at = COALESCE(decided_at, v_now),
      updated_at = v_now
  WHERE parent_id = v_app.parent_id
    AND child_id = v_app.child_id
    AND id <> v_app.id
    AND status IN ('draft', 'partial', 'submitted', 'in_review', 'approved', 'waitlisted');

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

