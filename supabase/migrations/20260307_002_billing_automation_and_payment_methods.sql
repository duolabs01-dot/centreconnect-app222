-- Billing automation primitives:
-- - reminder cadence + dunning tracking fields on invoices
-- - receipt metadata fields on invoices
-- - self-serve payment-method update records
-- - stored reusable payment-method authorizations per centre

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS reminder_last_stage TEXT,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_overdue_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dunning_state TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_last_error TEXT;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_dunning_state_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_dunning_state_check
  CHECK (dunning_state IN ('none', 'grace', 'suspended', 'reactivated'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_receipt_number_unique
  ON public.invoices(receipt_number)
  WHERE receipt_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_status_due_unpaid
  ON public.invoices(status, due_at)
  WHERE paid_at IS NULL;

CREATE TABLE IF NOT EXISTS public.billing_payment_method_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  paystack_reference TEXT UNIQUE,
  payment_url TEXT,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.billing_payment_method_updates
  DROP CONSTRAINT IF EXISTS billing_payment_method_updates_status_check;

ALTER TABLE public.billing_payment_method_updates
  ADD CONSTRAINT billing_payment_method_updates_status_check
  CHECK (status IN ('pending', 'completed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_billing_payment_method_updates_ecd_created
  ON public.billing_payment_method_updates(ecd_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_payment_method_updates_status_created
  ON public.billing_payment_method_updates(status, created_at DESC);

DROP TRIGGER IF EXISTS update_billing_payment_method_updates_updated_at ON public.billing_payment_method_updates;
CREATE TRIGGER update_billing_payment_method_updates_updated_at
  BEFORE UPDATE ON public.billing_payment_method_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.billing_payment_method_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment_method_updates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_payment_method_updates_select_strict" ON public.billing_payment_method_updates;
DROP POLICY IF EXISTS "billing_payment_method_updates_insert_platform_only" ON public.billing_payment_method_updates;
DROP POLICY IF EXISTS "billing_payment_method_updates_update_platform_only" ON public.billing_payment_method_updates;
DROP POLICY IF EXISTS "billing_payment_method_updates_delete_platform_only" ON public.billing_payment_method_updates;

CREATE POLICY "billing_payment_method_updates_select_strict" ON public.billing_payment_method_updates
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));

CREATE POLICY "billing_payment_method_updates_insert_platform_only" ON public.billing_payment_method_updates
  FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "billing_payment_method_updates_update_platform_only" ON public.billing_payment_method_updates
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "billing_payment_method_updates_delete_platform_only" ON public.billing_payment_method_updates
  FOR DELETE
  USING (is_platform_admin());

CREATE TABLE IF NOT EXISTS public.ecd_billing_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecd_id UUID NOT NULL UNIQUE REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  authorization_code TEXT NOT NULL,
  authorization_signature TEXT,
  card_type TEXT,
  last4 TEXT,
  exp_month TEXT,
  exp_year TEXT,
  bank TEXT,
  account_name TEXT,
  customer_code TEXT,
  customer_email TEXT,
  reusable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecd_billing_payment_methods_ecd_updated
  ON public.ecd_billing_payment_methods(ecd_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_ecd_billing_payment_methods_updated_at ON public.ecd_billing_payment_methods;
CREATE TRIGGER update_ecd_billing_payment_methods_updated_at
  BEFORE UPDATE ON public.ecd_billing_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.ecd_billing_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecd_billing_payment_methods FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecd_billing_payment_methods_select_strict" ON public.ecd_billing_payment_methods;
DROP POLICY IF EXISTS "ecd_billing_payment_methods_insert_platform_only" ON public.ecd_billing_payment_methods;
DROP POLICY IF EXISTS "ecd_billing_payment_methods_update_platform_only" ON public.ecd_billing_payment_methods;
DROP POLICY IF EXISTS "ecd_billing_payment_methods_delete_platform_only" ON public.ecd_billing_payment_methods;

CREATE POLICY "ecd_billing_payment_methods_select_strict" ON public.ecd_billing_payment_methods
  FOR SELECT
  USING (is_platform_admin() OR ecd_id IN (SELECT get_user_ecd_ids()));

CREATE POLICY "ecd_billing_payment_methods_insert_platform_only" ON public.ecd_billing_payment_methods
  FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "ecd_billing_payment_methods_update_platform_only" ON public.ecd_billing_payment_methods
  FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "ecd_billing_payment_methods_delete_platform_only" ON public.ecd_billing_payment_methods
  FOR DELETE
  USING (is_platform_admin());
