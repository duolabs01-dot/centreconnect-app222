-- supabase/migrations/030_paystack_idempotency.sql
-- Add idempotency fields to invoices for Paystack webhook protection.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT,
  ADD COLUMN IF NOT EXISTS paystack_event_processed_at TIMESTAMPTZ;

-- Create a unique index to prevent duplicate processing of the same Paystack event.
-- Only applies when paystack_reference is not null.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_paystack_ref 
  ON public.invoices(paystack_reference) 
  WHERE paystack_reference IS NOT NULL;
