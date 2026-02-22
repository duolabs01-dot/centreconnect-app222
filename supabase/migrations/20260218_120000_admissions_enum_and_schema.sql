-- Admissions/Daily Ops/Comms/Employment schema foundations (additive)

-- 1) Extend or create application_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM (
      'submitted', 'in_review', 'approved', 'enrolled',
      'waitlisted', 'rejected', 'withdrawn'
    );
  ELSE
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'submitted';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'in_review';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'approved';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'enrolled';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'waitlisted';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'rejected';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'withdrawn';
  END IF;
END$$;

-- 2) job_pipeline_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_pipeline_status') THEN
    CREATE TYPE job_pipeline_status AS ENUM (
      'new', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'
    );
  END IF;
END$$;

-- 3) children compatibility fields (table already exists in this repo)
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

UPDATE public.children
SET full_name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
WHERE full_name IS NULL;

-- 4) applications compatibility fields (table already exists)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS share_multiple_flag BOOLEAN NOT NULL DEFAULT FALSE;

-- 5) guardians (new, child-linked contacts used for pickup)
CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  id_photo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES public.user_profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardians_parent_id ON public.guardians(parent_id);
CREATE INDEX IF NOT EXISTS idx_guardians_child_id ON public.guardians(child_id);

-- 6) attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES public.user_profiles(id),
  picked_up BOOLEAN NOT NULL DEFAULT FALSE,
  picked_up_at TIMESTAMPTZ,
  pickup_code_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ecd_id, child_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_ecd_date ON public.attendance(ecd_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_child_date ON public.attendance(child_id, date DESC);

-- 7) pickup_codes
CREATE TABLE IF NOT EXISTS public.pickup_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  code CHAR(6) NOT NULL,
  generated_by UUID NOT NULL REFERENCES public.user_profiles(id),
  generated_by_role TEXT NOT NULL CHECK (generated_by_role IN ('parent', 'centre')),
  parent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  parent_confirmed_at TIMESTAMPTZ,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.user_profiles(id),
  failed_attempts INT NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_codes_lookup ON public.pickup_codes(ecd_id, child_id, code);
CREATE INDEX IF NOT EXISTS idx_pickup_codes_parent_recent ON public.pickup_codes(parent_id, created_at DESC);

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS fk_pickup_code;
ALTER TABLE public.attendance
  ADD CONSTRAINT fk_pickup_code
  FOREIGN KEY (pickup_code_id) REFERENCES public.pickup_codes(id);

-- 8) pickup_audit_log
CREATE TABLE IF NOT EXISTS public.pickup_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  pickup_code_id UUID NOT NULL REFERENCES public.pickup_codes(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.user_profiles(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_audit_log_ecd_time ON public.pickup_audit_log(ecd_id, created_at DESC);

-- 9) announcements compatibility fields (existing table: title + content + created_by)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'class', 'individual')),
  ADD COLUMN IF NOT EXISTS class_id UUID,
  ADD COLUMN IF NOT EXISTS target_child_id UUID REFERENCES public.children(id),
  ADD COLUMN IF NOT EXISTS template_type TEXT;

UPDATE public.announcements
SET body = content
WHERE body IS NULL;

UPDATE public.announcements
SET author_id = created_by
WHERE author_id IS NULL;

-- 10) announcement_reads
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_parent ON public.announcement_reads(parent_id, read_at DESC);

-- 11) message_threads
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  context_type TEXT CHECK (context_type IN ('application', 'pickup', 'general')),
  context_id UUID,
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_ecd_created ON public.message_threads(ecd_id, created_at DESC);

-- 12) messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.user_profiles(id),
  body TEXT NOT NULL,
  read_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON public.messages(thread_id, created_at ASC);

-- 13) jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('assistant', 'cook', 'cleaner', 'driver', 'practitioner', 'other')),
  description TEXT,
  requirements TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  closes_at DATE,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_ecd_created ON public.jobs(ecd_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_public ON public.jobs(is_published, published_at DESC);

-- 14) job_applications
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  cv_url TEXT,
  cover_letter TEXT,
  status job_pipeline_status NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_ecd_created ON public.job_applications(ecd_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications(job_id, created_at DESC);

-- 15) notifications (distinct from existing parent_notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

