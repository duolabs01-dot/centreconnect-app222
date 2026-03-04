-- Revenue and billing performance indexes.
-- Speeds up admin revenue ordering and monthly invoice generation lookups.

CREATE INDEX IF NOT EXISTS idx_invoices_created_at_desc
  ON public.invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_ecd_created_at
  ON public.invoices(ecd_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at_desc
  ON public.subscriptions(created_at DESC);
