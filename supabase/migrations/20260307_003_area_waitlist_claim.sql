-- Create tables for tracking area searches, waitlist alerts, and claim requests.
create table if not exists area_search_counts (
  id uuid primary key default gen_random_uuid(),
  suburb text not null unique,
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists waitlist_notifications (
  id uuid primary key default gen_random_uuid(),
  parent_email text not null,
  centre_slug text not null,
  created_at timestamptz not null default now()
);

create table if not exists claim_requests (
  id uuid primary key default gen_random_uuid(),
  centre_slug text not null,
  contact_name text not null,
  role text not null,
  phone text not null,
  email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
