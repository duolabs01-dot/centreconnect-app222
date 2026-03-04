create table if not exists public.document_audit_log (
  id uuid primary key default gen_random_uuid(),
  document_id text not null,
  document_name text not null,
  owner_id uuid not null references auth.users(id),
  actor_id uuid references auth.users(id),
  action text not null check (action in ('upload','view','download','delete')),
  actor_hint text,
  created_at timestamptz default now()
);

alter table public.document_audit_log
  enable row level security;

create policy "Owners see their own audit log"
  on public.document_audit_log
  for select using (auth.uid() = owner_id);

create policy "System can insert audit entries"
  on public.document_audit_log
  for insert with check (true);
