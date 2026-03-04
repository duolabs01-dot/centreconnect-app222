-- Fix signup bootstrap failures caused by strict RLS on user_profiles/parents.
-- Ensures auth user bootstrap trigger runs as SECURITY DEFINER and internal roles
-- can insert/update bootstrap rows without requiring auth.uid().

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incoming_role user_role;
BEGIN
  incoming_role :=
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'role')::text IN ('platform_admin', 'ecd_admin', 'ecd_staff', 'parent_user')
        THEN (NEW.raw_user_meta_data ->> 'role')::user_role
      ELSE 'parent_user'::user_role
    END;

  INSERT INTO public.user_profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    incoming_role,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'New User'),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.user_profiles.phone);

  IF incoming_role = 'parent_user' THEN
    INSERT INTO public.parents (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

DO $$
DECLARE
  has_service_role BOOLEAN;
  has_auth_admin BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'service_role') INTO has_service_role;
  SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') INTO has_auth_admin;

  DROP POLICY IF EXISTS "profiles_insert_bootstrap_service_role" ON public.user_profiles;
  DROP POLICY IF EXISTS "profiles_update_bootstrap_service_role" ON public.user_profiles;
  DROP POLICY IF EXISTS "parents_insert_bootstrap_service_role" ON public.parents;
  DROP POLICY IF EXISTS "profiles_insert_bootstrap_auth_admin" ON public.user_profiles;
  DROP POLICY IF EXISTS "profiles_update_bootstrap_auth_admin" ON public.user_profiles;
  DROP POLICY IF EXISTS "parents_insert_bootstrap_auth_admin" ON public.parents;

  IF has_service_role THEN
    EXECUTE $sql$
      CREATE POLICY "profiles_insert_bootstrap_service_role"
      ON public.user_profiles
      FOR INSERT
      TO service_role
      WITH CHECK (true)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profiles_update_bootstrap_service_role"
      ON public.user_profiles
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "parents_insert_bootstrap_service_role"
      ON public.parents
      FOR INSERT
      TO service_role
      WITH CHECK (true)
    $sql$;
  END IF;

  IF has_auth_admin THEN
    EXECUTE $sql$
      CREATE POLICY "profiles_insert_bootstrap_auth_admin"
      ON public.user_profiles
      FOR INSERT
      TO supabase_auth_admin
      WITH CHECK (true)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profiles_update_bootstrap_auth_admin"
      ON public.user_profiles
      FOR UPDATE
      TO supabase_auth_admin
      USING (true)
      WITH CHECK (true)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "parents_insert_bootstrap_auth_admin"
      ON public.parents
      FOR INSERT
      TO supabase_auth_admin
      WITH CHECK (true)
    $sql$;
  END IF;
END;
$$;
