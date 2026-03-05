alter table if exists public.user_profiles
  add column if not exists first_name text,
  add column if not exists surname text;

alter table if exists public.ecd_centres
  add column if not exists primary_contact_first_name text,
  add column if not exists primary_contact_surname text;

update public.user_profiles
set
  first_name = coalesce(
    nullif(trim(first_name), ''),
    nullif(split_part(trim(full_name), ' ', 1), '')
  ),
  surname = coalesce(
    nullif(trim(surname), ''),
    nullif(trim(regexp_replace(trim(full_name), '^\S+\s*', '')), '')
  )
where coalesce(trim(full_name), '') <> '';

update public.ecd_centres
set
  primary_contact_first_name = coalesce(
    nullif(trim(primary_contact_first_name), ''),
    nullif(split_part(trim(primary_contact_name), ' ', 1), '')
  ),
  primary_contact_surname = coalesce(
    nullif(trim(primary_contact_surname), ''),
    nullif(trim(regexp_replace(trim(primary_contact_name), '^\S+\s*', '')), '')
  )
where coalesce(trim(primary_contact_name), '') <> '';
