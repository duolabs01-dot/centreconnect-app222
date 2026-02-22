-- Atomic pickup verification RPC to avoid partial write states.

CREATE OR REPLACE FUNCTION public.verify_pickup_code_atomic(
  p_ecd_id UUID,
  p_child_id UUID,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_actor UUID := auth.uid();
  v_pickup_code RECORD;
  v_child RECORD;
  v_guardian RECORD;
  v_next_failed_attempts INT;
  v_should_lock BOOLEAN;
  v_input_code TEXT := trim(COALESCE(p_code, ''));
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT public.is_ecd_member(p_ecd_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF v_input_code !~ '^\d{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid');
  END IF;

  SELECT id, parent_id, code, used, locked, expires_at, failed_attempts
  INTO v_pickup_code
  FROM public.pickup_codes
  WHERE ecd_id = p_ecd_id
    AND child_id = p_child_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF COALESCE(v_pickup_code.used, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'used');
  END IF;

  IF COALESCE(v_pickup_code.locked, FALSE) OR COALESCE(v_pickup_code.failed_attempts, 0) >= 5 THEN
    UPDATE public.pickup_codes
    SET locked = TRUE
    WHERE id = v_pickup_code.id
      AND locked = FALSE;

    INSERT INTO public.pickup_audit_log (ecd_id, child_id, pickup_code_id, action, actor_id, metadata)
    VALUES (p_ecd_id, p_child_id, v_pickup_code.id, 'locked', v_actor, '{}'::jsonb);

    RETURN jsonb_build_object('success', false, 'error', 'locked');
  END IF;

  IF v_pickup_code.expires_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF v_pickup_code.code <> v_input_code THEN
    v_next_failed_attempts := COALESCE(v_pickup_code.failed_attempts, 0) + 1;
    v_should_lock := v_next_failed_attempts >= 5;

    UPDATE public.pickup_codes
    SET failed_attempts = v_next_failed_attempts,
        locked = v_should_lock
    WHERE id = v_pickup_code.id;

    INSERT INTO public.pickup_audit_log (ecd_id, child_id, pickup_code_id, action, actor_id, metadata)
    VALUES (
      p_ecd_id,
      p_child_id,
      v_pickup_code.id,
      CASE WHEN v_should_lock THEN 'locked' ELSE 'failed_attempt' END,
      v_actor,
      '{}'::jsonb
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', CASE WHEN v_should_lock THEN 'locked' ELSE 'invalid' END
    );
  END IF;

  UPDATE public.pickup_codes
  SET used = TRUE,
      used_at = v_now,
      used_by = v_actor
  WHERE id = v_pickup_code.id
    AND used = FALSE
    AND locked = FALSE
    AND expires_at >= v_now;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid');
  END IF;

  INSERT INTO public.attendance (
    ecd_id, child_id, date, picked_up, picked_up_at, pickup_code_id
  )
  VALUES (
    p_ecd_id, p_child_id, v_now::date, TRUE, v_now, v_pickup_code.id
  )
  ON CONFLICT (ecd_id, child_id, date)
  DO UPDATE SET
    picked_up = EXCLUDED.picked_up,
    picked_up_at = EXCLUDED.picked_up_at,
    pickup_code_id = EXCLUDED.pickup_code_id;

  INSERT INTO public.notifications (user_id, ecd_id, type, title, body, data)
  VALUES (
    v_pickup_code.parent_id,
    p_ecd_id,
    'pickup_completed',
    'Child picked up',
    'Pickup has been verified by the centre.',
    jsonb_build_object('child_id', p_child_id, 'pickup_code_id', v_pickup_code.id)
  );

  INSERT INTO public.pickup_audit_log (ecd_id, child_id, pickup_code_id, action, actor_id, metadata)
  VALUES (p_ecd_id, p_child_id, v_pickup_code.id, 'code_used', v_actor, '{}'::jsonb);

  SELECT
    COALESCE(NULLIF(c.full_name, ''), trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))) AS child_name,
    COALESCE(c.profile_photo_url, c.photo_url) AS child_photo_url
  INTO v_child
  FROM public.children c
  WHERE c.id = p_child_id;

  SELECT g.full_name
  INTO v_guardian
  FROM public.guardians g
  WHERE g.child_id = p_child_id
    AND g.is_verified = TRUE
  ORDER BY g.verified_at DESC NULLS LAST, g.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'childName', COALESCE(NULLIF(v_child.child_name, ''), 'Child'),
    'guardianName', v_guardian.full_name,
    'childPhotoUrl', v_child.child_photo_url
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pickup_code_atomic(UUID, UUID, TEXT) TO authenticated;
