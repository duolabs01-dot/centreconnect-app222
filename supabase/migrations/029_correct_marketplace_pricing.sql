-- Correct marketplace service pricing to SA ECD market-appropriate rates.
-- Based on the business proposal.

-- Ensure billing_type column exists
ALTER TABLE public.marketplace_services 
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'once' CHECK (billing_type IN ('once', 'monthly', 'quarterly'));

-- Update prices (converted from cents to Rand decimal)
UPDATE public.marketplace_services SET price = 799.00 WHERE service_name ILIKE '%Bookkeeping%';
UPDATE public.marketplace_services SET price = 499.00 WHERE service_name ILIKE '%WhatsApp Business Setup%';
UPDATE public.marketplace_services SET price = 1499.00 WHERE service_name ILIKE '%WhatsApp API Integration%';
UPDATE public.marketplace_services SET price = 299.00 WHERE service_name ILIKE '%Compliance Training%';
UPDATE public.marketplace_services SET price = 699.00 WHERE service_name ILIKE '%Team Training%';
UPDATE public.marketplace_services SET price = 799.00 WHERE service_name ILIKE '%Practitioner Upskilling%';
UPDATE public.marketplace_services SET price = 799.00 WHERE service_name ILIKE '%Starter Website%';
UPDATE public.marketplace_services SET price = 1799.00 WHERE service_name ILIKE '%Premium Website%';
UPDATE public.marketplace_services SET price = 1299.00 WHERE service_name ILIKE '%Photography%';
UPDATE public.marketplace_services SET price = 149.00 WHERE service_name ILIKE '%Activity Pack%';
UPDATE public.marketplace_services SET price = 699.00 WHERE service_name ILIKE '%Curriculum Pack%';
UPDATE public.marketplace_services SET price = 999.00 WHERE service_name ILIKE '%Subsidy%';

-- Update recurring intervals
UPDATE public.marketplace_services SET billing_type = 'monthly' WHERE service_name ILIKE '%Bookkeeping%';
UPDATE public.marketplace_services SET billing_type = 'monthly' WHERE service_name ILIKE '%Activity Pack%';
