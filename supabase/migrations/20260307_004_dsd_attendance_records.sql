-- Create classes table if it doesn't exist (needed for DSD grouping)
create table if not exists ecd_classes (
  id uuid primary key default gen_random_uuid(),
  ecd_id uuid references ecd_centres(id) on delete cascade,
  name text not null,
  practitioner_name text,
  age_group text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on classes
alter table ecd_classes enable row level security;

create policy "ECD admins can manage their own classes"
  on ecd_classes for all
  using (ecd_id in (select ecd_id from ecd_admins where user_id = auth.uid()));

-- Create the DSD-compliant attendance_records table
create type attendance_status as enum ('present', 'absent', 'sick', 'late');

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references ecd_centres(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  class_id uuid references ecd_classes(id) on delete set null,
  date date not null,
  status attendance_status not null,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(child_id, date)
);

-- Enable RLS on attendance_records
alter table attendance_records enable row level security;

create policy "ECD admins can manage their own attendance records"
  on attendance_records for all
  using (centre_id in (select ecd_id from ecd_admins where user_id = auth.uid()));

-- Indexing for performance
create index idx_attendance_records_centre_date on attendance_records(centre_id, date);
create index idx_attendance_records_child_date on attendance_records(child_id, date);
create index idx_attendance_records_class_date on attendance_records(class_id, date);

-- Add class_id to children table if not present for grouping
do $$ 
begin
  if not exists (select 1 from INFORMATION_SCHEMA.COLUMNS where table_name = 'children' and column_name = 'class_id') then
    alter table children add column class_id uuid references ecd_classes(id) on delete set null;
  end if;
end $$;
