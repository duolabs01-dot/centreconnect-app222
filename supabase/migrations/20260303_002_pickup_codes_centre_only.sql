-- Enforce centre-managed pickup code generation.
-- Pickup codes are created automatically when attendance check-in is marked present.

CREATE OR REPLACE FUNCTION public.generate_pickup_code_atomic(
  p_ecd_id UUID,
  p_child_id UUID,
  p_parent_id UUID,
  p_generated_by_role TEXT,
  p_code TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 minutes')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_code_id UUID;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF p_generated_by_role <> 'centre' THEN
    RETURN jsonb_build_object('success', false, 'error', 'centre_only');
  END IF;

  IF trim(COALESCE(p_code, '')) !~ '^\d{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF NOT public.is_ecd_member(p_ecd_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  INSERT INTO public.pickup_codes (
    ecd_id,
    child_id,
    parent_id,
    code,
    generated_by,
    generated_by_role,
    expires_at
  )
  VALUES (
    p_ecd_id,
    p_child_id,
    p_parent_id,
    trim(p_code),
    v_actor,
    p_generated_by_role,
    COALESCE(p_expires_at, NOW() + INTERVAL '60 minutes')
  )
  RETURNING id INTO v_code_id;

  INSERT INTO public.notifications (user_id, ecd_id, type, title, body, data)
  VALUES (
    p_parent_id,
    p_ecd_id,
    'pickup_code_requires_confirmation',
    'Pickup code generated',
    'A pickup code is now available in your child profile.',
    jsonb_build_object('child_id', p_child_id, 'pickup_code_id', v_code_id)
  );

  INSERT INTO public.pickup_audit_log (ecd_id, child_id, pickup_code_id, action, actor_id, metadata)
  VALUES (
    p_ecd_id,
    p_child_id,
    v_code_id,
    'generated_by_centre',
    v_actor,
    '{}'::jsonb
  );

  RETURN jsonb_build_object('success', true, 'pickupCodeId', v_code_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_pickup_code_atomic(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
