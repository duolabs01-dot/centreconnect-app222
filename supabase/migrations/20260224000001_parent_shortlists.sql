create table if not exists public.parent_shortlists (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  centre_id uuid not null references public.ecd_centres(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(parent_id, centre_id)
);

alter table public.parent_shortlists enable row level security;

create policy "Parents manage their own shortlist"
  on public.parent_shortlists
  for all
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

create index if not exists idx_parent_shortlists_parent_id
  on public.parent_shortlists(parent_id);
