-- supabase/migrations/039_recurring_invoices.sql
-- Add monthly fee fields to applications and billing month/child links to invoices.

-- 1. Add fee fields to applications
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS monthly_fee_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_notes TEXT;

-- 2. Add billing context to invoices
-- This allows linking an invoice to a specific parent/child/month cycle.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_month DATE;

-- 3. Create index for recurring billing lookups
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_lookup 
  ON public.invoices(ecd_id, child_id, billing_month);

-- 4. Create index for enrolled applications with fees
CREATE INDEX IF NOT EXISTS idx_applications_enrolled_fee 
  ON public.applications(status, monthly_fee_cents) 
  WHERE status = 'enrolled' AND monthly_fee_cents > 0;
