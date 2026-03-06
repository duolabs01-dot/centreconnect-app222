create table if not exists public.parent_form_submit_failures (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  route_path text not null,
  form_name text not null,
  failure_type text not null,
  source text not null default 'client',
  error_code text,
  error_message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint parent_form_submit_failures_source_check check (source in ('client', 'server'))
);

create index if not exists idx_parent_form_submit_failures_parent_created
  on public.parent_form_submit_failures(parent_id, created_at desc);

create index if not exists idx_parent_form_submit_failures_route_failure_created
  on public.parent_form_submit_failures(route_path, failure_type, created_at desc);

alter table public.parent_form_submit_failures enable row level security;
alter table public.parent_form_submit_failures force row level security;

drop policy if exists "parent_form_submit_failures_select_own_or_platform" on public.parent_form_submit_failures;
create policy "parent_form_submit_failures_select_own_or_platform"
  on public.parent_form_submit_failures
  for select
  using (parent_id = auth.uid() or is_platform_admin());

drop policy if exists "parent_form_submit_failures_insert_own" on public.parent_form_submit_failures;
create policy "parent_form_submit_failures_insert_own"
  on public.parent_form_submit_failures
  for insert
  with check (parent_id = auth.uid());
