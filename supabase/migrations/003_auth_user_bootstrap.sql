-- Bootstrap profile rows for new auth users.
-- This avoids client-side RLS failures during signup when no session exists yet.

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
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
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
