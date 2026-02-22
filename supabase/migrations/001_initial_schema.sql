-- CentreConnect Database Schema
-- Multi-tenant SaaS for ECD centres

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('platform_admin', 'ecd_admin', 'ecd_staff', 'parent_user');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM ('basic', 'standard', 'premium');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'canceled', 'suspended');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM ('submitted', 'in_review', 'approved', 'waitlisted', 'rejected', 'withdrawn');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
        CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_response', 'resolved', 'closed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_category') THEN
        CREATE TYPE support_ticket_category AS ENUM ('technical', 'billing', 'application', 'general');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'canceled');
    END IF;
END $$;

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'parent_user',
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ECD Centres
CREATE TABLE IF NOT EXISTS ecd_centres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    suburb TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Johannesburg',
    province TEXT NOT NULL DEFAULT 'Gauteng',
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_registered BOOLEAN NOT NULL DEFAULT false,
    registration_number TEXT,
    capacity INTEGER,
    age_groups TEXT[],
    logo_url TEXT,
    cover_image_url TEXT,
    primary_color TEXT DEFAULT '#2E7EC8',
    is_active BOOLEAN NOT NULL DEFAULT true,
    onboarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecd_centres_slug ON ecd_centres(slug);
CREATE INDEX IF NOT EXISTS idx_ecd_centres_location ON ecd_centres(suburb, city);
CREATE INDEX IF NOT EXISTS idx_ecd_centres_active ON ecd_centres(is_active) WHERE is_active = true;

-- ECD Admins
CREATE TABLE IF NOT EXISTS ecd_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'ecd_admin' CHECK (role IN ('ecd_admin', 'ecd_staff')),
    invited_by UUID REFERENCES user_profiles(id),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(ecd_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ecd_admins_ecd ON ecd_admins(ecd_id);
CREATE INDEX IF NOT EXISTS idx_ecd_admins_user ON ecd_admins(user_id);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecd_id UUID NOT NULL UNIQUE REFERENCES ecd_centres(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'basic',
    status subscription_status NOT NULL DEFAULT 'trial',
    monthly_price DECIMAL(10, 2) NOT NULL,
    setup_fee DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_ecd ON subscriptions(ecd_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    issued_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    line_items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_ecd ON invoices(ecd_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Parents
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    id_number TEXT,
    alt_phone TEXT,
    address TEXT,
    suburb TEXT,
    city TEXT,
    province TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Children
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT,
    allergies TEXT,
    medical_conditions TEXT,
    special_needs TEXT,
    birth_certificate_url TEXT,
    immunization_record_url TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number TEXT NOT NULL UNIQUE,
    ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    status application_status NOT NULL DEFAULT 'submitted',
    priority INTEGER DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    start_date DATE,
    parent_message TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ecd_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_ecd ON applications(ecd_id);
CREATE INDEX IF NOT EXISTS idx_applications_parent ON applications(parent_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Application Status History
CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    old_status application_status,
    new_status application_status NOT NULL,
    changed_by UUID REFERENCES user_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_history_application ON application_status_history(application_id);

-- ECD Media
CREATE TABLE IF NOT EXISTS ecd_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    title TEXT,
    alt_text TEXT,
    category TEXT,
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecd_media_ecd ON ecd_media(ecd_id);

-- ECD Content
CREATE TABLE IF NOT EXISTS ecd_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    content_blocks JSONB NOT NULL DEFAULT '[]',
    updated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ecd_id, section)
);

CREATE INDEX IF NOT EXISTS idx_ecd_content_ecd ON ecd_content(ecd_id);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_ecd ON calendar_events(ecd_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date DESC);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_ecd ON announcements(ecd_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at DESC);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT NOT NULL UNIQUE,
    ecd_id UUID REFERENCES ecd_centres(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES user_profiles(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category support_ticket_category NOT NULL DEFAULT 'general',
    status support_ticket_status NOT NULL DEFAULT 'open',
    priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_ecd ON support_tickets(ecd_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator ON support_tickets(created_by);

-- Support Ticket Messages
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id),
    ecd_id UUID REFERENCES ecd_centres(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ecd ON audit_logs(ecd_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_ecd_centres_updated_at ON ecd_centres;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_parents_updated_at ON parents;
DROP TRIGGER IF EXISTS update_children_updated_at ON children;
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_ecd_centres_updated_at BEFORE UPDATE ON ecd_centres FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecd_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_ecd_ids()
RETURNS SETOF UUID AS $$
    SELECT ecd_id FROM ecd_admins WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies (simplified for MVP)
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Public read active centres" ON ecd_centres;
DROP POLICY IF EXISTS "ECD admins read own centres" ON ecd_centres;
DROP POLICY IF EXISTS "Platform admins full access centres" ON ecd_centres;

DROP POLICY IF EXISTS "Parents read own parent profile" ON parents;
DROP POLICY IF EXISTS "Parents create own parent profile" ON parents;
DROP POLICY IF EXISTS "Parents update own parent profile" ON parents;

DROP POLICY IF EXISTS "Parents manage own children" ON children;
DROP POLICY IF EXISTS "Parents view own applications" ON applications;
DROP POLICY IF EXISTS "Parents create applications" ON applications;
DROP POLICY IF EXISTS "ECD admins manage centre applications" ON applications;

CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users create own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public read active centres" ON ecd_centres FOR SELECT USING (is_active = true);
CREATE POLICY "ECD admins read own centres" ON ecd_centres FOR SELECT USING (id IN (SELECT get_user_ecd_ids()));
CREATE POLICY "Platform admins full access centres" ON ecd_centres FOR ALL USING (is_platform_admin());

CREATE POLICY "Parents read own parent profile" ON parents FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents create own parent profile" ON parents FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Parents update own parent profile" ON parents FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Parents manage own children" ON children FOR ALL USING (parent_id = auth.uid());
CREATE POLICY "Parents view own applications" ON applications FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Parents create applications" ON applications FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "ECD admins manage centre applications" ON applications FOR ALL USING (ecd_id IN (SELECT get_user_ecd_ids()));

