-- Parent profile suite: preferences, contacts, guardians, documents, security events

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_times TEXT,
  ADD COLUMN IF NOT EXISTS home_language TEXT,
  ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
  ADD COLUMN IF NOT EXISTS preferred_start_month TEXT,
  ADD COLUMN IF NOT EXISTS max_monthly_budget NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS transport_needed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_radius_km INTEGER,
  ADD COLUMN IF NOT EXISTS preferred_suburbs TEXT[],
  ADD COLUMN IF NOT EXISTS id_verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS medical_aid_name TEXT,
  ADD COLUMN IF NOT EXISTS medical_aid_number TEXT,
  ADD COLUMN IF NOT EXISTS consent_data_sharing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_application_updates BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_marketing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS auto_pay_enabled BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.parent_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  permission TEXT NOT NULL DEFAULT 'view',
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_emergency_contacts_parent ON public.parent_emergency_contacts(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_guardians_parent ON public.parent_guardians(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_documents_parent ON public.parent_documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_security_events_parent ON public.parent_security_events(parent_id, created_at DESC);

DROP TRIGGER IF EXISTS update_parent_emergency_contacts_updated_at ON public.parent_emergency_contacts;
CREATE TRIGGER update_parent_emergency_contacts_updated_at
  BEFORE UPDATE ON public.parent_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_parent_guardians_updated_at ON public.parent_guardians;
CREATE TRIGGER update_parent_guardians_updated_at
  BEFORE UPDATE ON public.parent_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_parent_documents_updated_at ON public.parent_documents;
CREATE TRIGGER update_parent_documents_updated_at
  BEFORE UPDATE ON public.parent_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.parent_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_security_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.parent_emergency_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parent_guardians FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parent_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parent_security_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_emergency_contacts_select_own" ON public.parent_emergency_contacts;
DROP POLICY IF EXISTS "parent_emergency_contacts_insert_own" ON public.parent_emergency_contacts;
DROP POLICY IF EXISTS "parent_emergency_contacts_update_own" ON public.parent_emergency_contacts;
DROP POLICY IF EXISTS "parent_emergency_contacts_delete_own" ON public.parent_emergency_contacts;
CREATE POLICY "parent_emergency_contacts_select_own" ON public.parent_emergency_contacts
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "parent_emergency_contacts_insert_own" ON public.parent_emergency_contacts
  FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "parent_emergency_contacts_update_own" ON public.parent_emergency_contacts
  FOR UPDATE USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());
CREATE POLICY "parent_emergency_contacts_delete_own" ON public.parent_emergency_contacts
  FOR DELETE USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "parent_guardians_select_own" ON public.parent_guardians;
DROP POLICY IF EXISTS "parent_guardians_insert_own" ON public.parent_guardians;
DROP POLICY IF EXISTS "parent_guardians_update_own" ON public.parent_guardians;
DROP POLICY IF EXISTS "parent_guardians_delete_own" ON public.parent_guardians;
CREATE POLICY "parent_guardians_select_own" ON public.parent_guardians
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "parent_guardians_insert_own" ON public.parent_guardians
  FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "parent_guardians_update_own" ON public.parent_guardians
  FOR UPDATE USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());
CREATE POLICY "parent_guardians_delete_own" ON public.parent_guardians
  FOR DELETE USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "parent_documents_select_own" ON public.parent_documents;
DROP POLICY IF EXISTS "parent_documents_insert_own" ON public.parent_documents;
DROP POLICY IF EXISTS "parent_documents_update_own" ON public.parent_documents;
DROP POLICY IF EXISTS "parent_documents_delete_own" ON public.parent_documents;
CREATE POLICY "parent_documents_select_own" ON public.parent_documents
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "parent_documents_insert_own" ON public.parent_documents
  FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "parent_documents_update_own" ON public.parent_documents
  FOR UPDATE USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());
CREATE POLICY "parent_documents_delete_own" ON public.parent_documents
  FOR DELETE USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "parent_security_events_select_own" ON public.parent_security_events;
DROP POLICY IF EXISTS "parent_security_events_insert_own" ON public.parent_security_events;
CREATE POLICY "parent_security_events_select_own" ON public.parent_security_events
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "parent_security_events_insert_own" ON public.parent_security_events
  FOR INSERT WITH CHECK (parent_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('parent-avatars', 'parent-avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('parent-documents', 'parent-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "parent_avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "parent_avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "parent_avatars_delete_own" ON storage.objects;
CREATE POLICY "parent_avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'parent-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "parent_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'parent-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'parent-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "parent_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'parent-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "parent_documents_select_own_storage" ON storage.objects;
DROP POLICY IF EXISTS "parent_documents_insert_own_storage" ON storage.objects;
DROP POLICY IF EXISTS "parent_documents_update_own_storage" ON storage.objects;
DROP POLICY IF EXISTS "parent_documents_delete_own_storage" ON storage.objects;
CREATE POLICY "parent_documents_select_own_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'parent-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "parent_documents_insert_own_storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'parent-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "parent_documents_update_own_storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'parent-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'parent-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "parent_documents_delete_own_storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'parent-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

