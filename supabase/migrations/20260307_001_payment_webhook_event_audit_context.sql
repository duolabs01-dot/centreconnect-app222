-- Capture source request context for webhook-event audit trails.
ALTER TABLE public.payment_webhook_events
  ADD COLUMN IF NOT EXISTS source_ip TEXT,
  ADD COLUMN IF NOT EXISTS source_user_agent TEXT;
