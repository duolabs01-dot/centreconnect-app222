-- Internal platform admin seed helper
-- Run after migrations (including 002_rls.sql).
-- This script expects an existing auth user with the email below.

DO $$
DECLARE
  v_admin_user_id UUID;
  v_sample_ecd_id UUID;
BEGIN
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email IN ('platform-admin@centreconnect.co.za', 'platform-admin@example.com')
  LIMIT 1;

  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, role, full_name, phone)
    VALUES (v_admin_user_id, 'platform_admin', 'Platform Admin', '+27 00 000 0000')
    ON CONFLICT (id)
    DO UPDATE SET
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone;
  ELSE
    RAISE NOTICE 'No auth user found for platform admin. Skipping user_profiles upsert.';
  END IF;

  INSERT INTO public.ecd_centres (
    slug,
    name,
    email,
    phone,
    address,
    suburb,
    city,
    province,
    is_active
  )
  VALUES (
    'seed-centre',
    'Seed ECD Centre',
    'seed-centre@example.com',
    '+27 11 000 0000',
    '123 Seed Street',
    'Braamfontein',
    'Johannesburg',
    'Gauteng',
    true
  )
  ON CONFLICT (slug)
  DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    suburb = EXCLUDED.suburb,
    city = EXCLUDED.city,
    province = EXCLUDED.province
  RETURNING id INTO v_sample_ecd_id;

  IF v_sample_ecd_id IS NULL THEN
    SELECT id INTO v_sample_ecd_id
    FROM public.ecd_centres
    WHERE slug = 'seed-centre'
    LIMIT 1;
  END IF;

  INSERT INTO public.subscriptions (
    ecd_id,
    tier,
    status,
    monthly_price
  )
  VALUES (
    v_sample_ecd_id,
    'basic',
    'trial',
    0
  )
  ON CONFLICT (ecd_id)
  DO UPDATE SET
    tier = EXCLUDED.tier,
    status = EXCLUDED.status,
    monthly_price = EXCLUDED.monthly_price;

  INSERT INTO public.ecd_admin_invitations (
    ecd_id,
    email,
    role,
    invited_by
  )
  VALUES (
    v_sample_ecd_id,
    'ecd-admin@example.com',
    'ecd_admin',
    v_admin_user_id
  )
  ON CONFLICT (ecd_id, email)
  DO UPDATE SET
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    invited_at = NOW();

  IF v_admin_user_id IS NULL THEN
    RAISE NOTICE 'Seed completed without platform admin profile. Create auth user and rerun seed to enable internal admin API tests.';
  END IF;
END $$;
