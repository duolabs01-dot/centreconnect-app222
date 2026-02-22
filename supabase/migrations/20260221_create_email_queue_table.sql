-- supabase/migrations/20260221_create_email_queue_table.sql
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    send_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Allow platform_admin to manage the email queue
CREATE POLICY "platform_admin_full_email_queue" ON public.email_queue
    FOR ALL USING (public.auth_role() = 'platform_admin');
