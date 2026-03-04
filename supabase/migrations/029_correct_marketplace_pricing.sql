-- Migration: Correct Marketplace Pricing to SA ECD market-appropriate rates.
-- Table: public.marketplace_services
-- Schema mapping: name -> service_name, price_cents -> price (converted to Rand numeric)

-- Ensure billing_type column exists
ALTER TABLE public.marketplace_services
ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'once'
CHECK (billing_type IN ('once', 'monthly', 'quarterly'));

-- Update Bookkeeping (799.00 / monthly)
UPDATE public.marketplace_services 
SET price = 799.00, billing_type = 'monthly'
WHERE service_name ILIKE '%Bookkeeping%';

-- Update WhatsApp Setup (499.00)
UPDATE public.marketplace_services 
SET price = 499.00
WHERE service_name ILIKE '%WhatsApp%Setup%';

-- Update WhatsApp API (1499.00)
UPDATE public.marketplace_services 
SET price = 1499.00
WHERE service_name ILIKE '%WhatsApp%API%';

-- Update Compliance Training (299.00)
UPDATE public.marketplace_services 
SET price = 299.00
WHERE service_name ILIKE '%Compliance%Training%';

-- Update Starter Website (799.00)
UPDATE public.marketplace_services 
SET price = 799.00
WHERE service_name ILIKE '%Starter%Website%';

-- Update Premium Website (1799.00)
UPDATE public.marketplace_services 
SET price = 1799.00
WHERE service_name ILIKE '%Premium%Website%';

-- Update Photography (1299.00)
UPDATE public.marketplace_services 
SET price = 1299.00
WHERE service_name ILIKE '%Photography%';

-- Update Activity Pack (149.00)
UPDATE public.marketplace_services 
SET price = 149.00
WHERE service_name ILIKE '%Activity%Pack%';
