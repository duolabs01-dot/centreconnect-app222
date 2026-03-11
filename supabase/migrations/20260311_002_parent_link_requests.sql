create table if not exists public.parent_link_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  ecd_id uuid not null references public.ecd_centres(id) on delete cascade,
  parent_email text not null,
  parent_phone text,
  parent_name text,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  secure_token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'opened', 'accepted', 'expired', 'cancelled')),
  email_mode text not null default 'invite'
    check (email_mode in ('link_profile', 'invite')),
  linked_user_id uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  opened_at timestamptz,
  accepted_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists parent_link_requests_child_idx
  on public.parent_link_requests (child_id, created_at desc);

create index if not exists parent_link_requests_ecd_idx
  on public.parent_link_requests (ecd_id, created_at desc);

create index if not exists parent_link_requests_email_idx
  on public.parent_link_requests (parent_email);

alter table public.parent_link_requests enable row level security;
