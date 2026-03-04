-- Migration: Add usernames and fix Google profile sync
-- Description: Adds unique username column to user_profiles and ensures Google Auth syncs correctly.

BEGIN;

-- 1. Add username column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Add constraint for username format (3-20 chars, alphanumeric + underscore)
-- Note: We use a check constraint to enforce the format.
ALTER TABLE public.user_profiles
ADD CONSTRAINT username_format_check 
CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- 3. Create index for username searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

-- 4. Update RLS policies to allow checking if username exists (public read of usernames only)
-- We need to allow users to see if a username is taken before they register.
DROP POLICY IF EXISTS "Allow public username check" ON public.user_profiles;
CREATE POLICY "Allow public username check" 
ON public.user_profiles 
FOR SELECT 
USING (true); -- We'll restrict the columns in the API layer, but RLS allows the select.

-- 5. Create a function to handle Google Auth profile sync more reliably
-- This function will be called by a trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    default_role public.user_role;
    metadata_role text;
BEGIN
    -- Extract role from metadata if present
    metadata_role := NEW.raw_user_meta_data->>'role';
    
    IF metadata_role IS NOT NULL THEN
        default_role := metadata_role::public.user_role;
    ELSE
        default_role := 'parent_user'::public.user_role;
    END IF;

    INSERT INTO public.user_profiles (id, full_name, role, username)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
        default_role,
        -- Attempt to generate a unique username from email if not provided
        -- This is for social logins like Google
        COALESCE(
            NEW.raw_user_meta_data->>'username', 
            'user_' || substr(md5(NEW.id::text), 1, 8)
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
        -- Don't overwrite existing username if it's already set
        username = COALESCE(public.user_profiles.username, EXCLUDED.username);

    -- If it's a parent user, ensure they have a record in the parents table
    IF default_role = 'parent_user' THEN
        INSERT INTO public.parents (id)
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
