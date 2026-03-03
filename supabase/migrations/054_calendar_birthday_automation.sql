BEGIN;

-- Centre-level controls for automated parent communication behavior.
ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS communication_automation_settings JSONB NOT NULL DEFAULT jsonb_build_object(
    'enabled', true,
    'auto_birthday_calendar', true,
    'auto_birthday_announcements', false,
    'send_channel', 'in_app_whatsapp',
    'send_time', '09:00',
    'reminder_delay_hours', 24,
    'application_reminder_template', 'Hello {{parent_name}}, your application for {{child_name}} at {{centre_name}} is almost complete. Please upload: {{missing_documents}}. Continue here: {{direct_link}}',
    'birthday_announcement_template', 'Happy birthday to {{child_name}}. From everyone at {{centre_name}}, we wish your family a wonderful day.',
    'include_centre_phone', true,
    'include_centre_email', false,
    'include_centre_whatsapp', true,
    'signoff', 'Admissions Team'
  );

COMMENT ON COLUMN public.ecd_centres.communication_automation_settings IS
  'Automation controls for reminders and parent messages (channel, send time, templates, and professional signoff).';

-- Stable id for system-generated events (for idempotent upserts, e.g. birthdays).
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS source_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_ecd_source_key_unique
  ON public.calendar_events (ecd_id, source_key);

CREATE INDEX IF NOT EXISTS idx_calendar_events_ecd_source_key
  ON public.calendar_events (ecd_id, source_key);

CREATE OR REPLACE FUNCTION public.ensure_child_birthday_events(
  p_ecd_id UUID,
  p_child_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_date_of_birth DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_day INTEGER;
  v_max_day INTEGER;
  v_event_date DATE;
  v_full_name TEXT;
  v_source_key TEXT;
BEGIN
  IF p_ecd_id IS NULL OR p_child_id IS NULL OR p_date_of_birth IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT (public.is_platform_admin() OR public.user_is_ecd_admin(p_ecd_id)) THEN
    RETURN;
  END IF;

  v_month := EXTRACT(MONTH FROM p_date_of_birth)::INTEGER;
  v_day := EXTRACT(DAY FROM p_date_of_birth)::INTEGER;
  v_full_name := NULLIF(TRIM(COALESCE(p_first_name, '') || ' ' || COALESCE(p_last_name, '')), '');
  IF v_full_name IS NULL THEN
    v_full_name := 'Child';
  END IF;

  FOR v_year IN EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER .. EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1 LOOP
    v_max_day := EXTRACT(DAY FROM (date_trunc('month', make_date(v_year, v_month, 1) + INTERVAL '1 month - 1 day'))::DATE)::INTEGER;
    v_event_date := make_date(v_year, v_month, LEAST(v_day, v_max_day));
    v_source_key := format('birthday:%s:%s', p_child_id, v_year);

    INSERT INTO public.calendar_events (
      ecd_id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      is_public,
      created_by,
      source_key
    )
    VALUES (
      p_ecd_id,
      format('Birthday: %s', v_full_name),
      format('Birthday reminder for %s.', v_full_name),
      v_event_date,
      '09:00'::TIME,
      '10:00'::TIME,
      FALSE,
      auth.uid(),
      v_source_key
    )
    ON CONFLICT (ecd_id, source_key)
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      event_date = EXCLUDED.event_date,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      is_public = EXCLUDED.is_public,
      updated_at = NOW();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_existing_birthday_events_for_centre(
  p_ecd_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child RECORD;
  v_synced_count INTEGER := 0;
BEGIN
  IF p_ecd_id IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT (public.is_platform_admin() OR public.user_is_ecd_admin(p_ecd_id)) THEN
    RETURN 0;
  END IF;

  FOR v_child IN
    SELECT id, first_name, last_name, date_of_birth
    FROM public.children
    WHERE ecd_id = p_ecd_id
      AND date_of_birth IS NOT NULL
  LOOP
    PERFORM public.ensure_child_birthday_events(
      p_ecd_id,
      v_child.id,
      v_child.first_name,
      v_child.last_name,
      v_child.date_of_birth
    );
    v_synced_count := v_synced_count + 1;
  END LOOP;

  RETURN v_synced_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_child_birthday_events(UUID, UUID, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_existing_birthday_events_for_centre(UUID) TO authenticated;

COMMIT;
