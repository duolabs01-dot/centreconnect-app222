-- Atomic pickup code generation RPC.

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

  IF p_generated_by_role NOT IN ('parent', 'centre') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_role');
  END IF;

  IF trim(COALESCE(p_code, '')) !~ '^\d{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF p_generated_by_role = 'parent' THEN
    IF v_actor <> p_parent_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'forbidden');
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.children c
      WHERE c.id = p_child_id
        AND c.parent_id = p_parent_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'forbidden');
    END IF;
  ELSE
    IF NOT public.is_ecd_member(p_ecd_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'forbidden');
    END IF;
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

  IF p_generated_by_role = 'centre' THEN
    INSERT INTO public.notifications (user_id, ecd_id, type, title, body, data)
    VALUES (
      p_parent_id,
      p_ecd_id,
      'pickup_code_requires_confirmation',
      'Pickup code generated',
      'A centre-generated pickup code requires your confirmation.',
      jsonb_build_object('child_id', p_child_id, 'pickup_code_id', v_code_id)
    );
  END IF;

  INSERT INTO public.pickup_audit_log (ecd_id, child_id, pickup_code_id, action, actor_id, metadata)
  VALUES (
    p_ecd_id,
    p_child_id,
    v_code_id,
    CASE
      WHEN p_generated_by_role = 'centre' THEN 'generated_by_centre'
      ELSE 'generated_by_parent'
    END,
    v_actor,
    '{}'::jsonb
  );

  RETURN jsonb_build_object('success', true, 'pickupCodeId', v_code_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_pickup_code_atomic(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
