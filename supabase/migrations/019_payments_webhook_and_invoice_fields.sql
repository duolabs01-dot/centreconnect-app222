-- Payments foundation: provider metadata on invoices + webhook event ledger.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_last_event TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payment_reference_unique
  ON public.invoices(payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reference TEXT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_reference
  ON public.payment_webhook_events(reference);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_invoice
  ON public.payment_webhook_events(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created
  ON public.payment_webhook_events(created_at DESC);

DROP TRIGGER IF EXISTS update_payment_webhook_events_updated_at ON public.payment_webhook_events;
CREATE TRIGGER update_payment_webhook_events_updated_at
  BEFORE UPDATE ON public.payment_webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_webhook_events_select_platform_only" ON public.payment_webhook_events;
DROP POLICY IF EXISTS "payment_webhook_events_insert_platform_only" ON public.payment_webhook_events;
DROP POLICY IF EXISTS "payment_webhook_events_update_platform_only" ON public.payment_webhook_events;
DROP POLICY IF EXISTS "payment_webhook_events_delete_platform_only" ON public.payment_webhook_events;

CREATE POLICY "payment_webhook_events_select_platform_only" ON public.payment_webhook_events
  FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "payment_webhook_events_insert_platform_only" ON public.payment_webhook_events
  FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "payment_webhook_events_update_platform_only" ON public.payment_webhook_events
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "payment_webhook_events_delete_platform_only" ON public.payment_webhook_events
  FOR DELETE
  USING (is_platform_admin());
