create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  session_token text not null,
  device_hint text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  constraint user_sessions_user_id_key unique (user_id)
);

alter table public.user_sessions enable row level security;

create policy "Users can only see their own session"
  on public.user_sessions
  for select using (auth.uid() = user_id);

create policy "Users can upsert their own session"
  on public.user_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own session"
  on public.user_sessions
  for update using (auth.uid() = user_id);
