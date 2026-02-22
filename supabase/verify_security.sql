-- CentreConnect security verification
-- Run after applying migrations (especially 012 + 013).
-- This script raises exceptions on failure.

DO $$
DECLARE
  v_missing_count INT;
BEGIN
  -- 1) application_status must include enrolled
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status'
      AND e.enumlabel = 'enrolled'
  ) THEN
    RAISE EXCEPTION 'Missing enum value: application_status.enrolled';
  END IF;

  -- 2) RLS must be enabled + forced on core tables
  WITH required(table_name) AS (
    VALUES
      ('user_profiles'),
      ('ecd_centres'),
      ('ecd_admins'),
      ('subscriptions'),
      ('invoices'),
      ('parents'),
      ('children'),
      ('applications'),
      ('application_status_history'),
      ('ecd_media'),
      ('ecd_content'),
      ('calendar_events'),
      ('announcements'),
      ('support_tickets'),
      ('support_ticket_messages'),
      ('audit_logs')
  )
  SELECT COUNT(*)
  INTO v_missing_count
  FROM required r
  LEFT JOIN pg_class c ON c.relname = r.table_name
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND (c.relrowsecurity IS DISTINCT FROM TRUE OR c.relforcerowsecurity IS DISTINCT FROM TRUE);

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'RLS not enabled/forced on % required table(s)', v_missing_count;
  END IF;

  -- 3) Critical functions must exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_user_ecd_ids'
  ) THEN
    RAISE EXCEPTION 'Missing function: public.get_user_ecd_ids()';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'provision_user_profile'
  ) THEN
    RAISE EXCEPTION 'Missing function: public.provision_user_profile(...)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'parent_accept_offer'
  ) THEN
    RAISE EXCEPTION 'Missing function: public.parent_accept_offer(UUID)';
  END IF;

  -- 4) Auth bootstrap trigger must exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Missing trigger: auth.users.on_auth_user_created';
  END IF;

  -- 5) Policy existence checks (high-value controls)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'applications'
      AND policyname = 'applications_insert_parent_strict'
  ) THEN
    RAISE EXCEPTION 'Missing policy: applications_insert_parent_strict';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'applications'
      AND policyname = 'applications_update_strict'
  ) THEN
    RAISE EXCEPTION 'Missing policy: applications_update_strict';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parents'
      AND policyname = 'parents_select_strict'
  ) THEN
    RAISE EXCEPTION 'Missing policy: parents_select_strict';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'children'
      AND policyname = 'children_insert_strict'
  ) THEN
    RAISE EXCEPTION 'Missing policy: children_insert_strict';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ecd_admins'
      AND policyname = 'ecd_admins_select_strict'
  ) THEN
    RAISE EXCEPTION 'Missing policy: ecd_admins_select_strict';
  END IF;

  RAISE NOTICE 'Security verification passed.';
END $$;
