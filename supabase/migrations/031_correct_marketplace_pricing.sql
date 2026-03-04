-- Correct marketplace service pricing as per business proposal.

UPDATE public.marketplace_services
SET price = 799.00
WHERE service_name = 'Bookkeeping Service';

UPDATE public.marketplace_services
SET price = 499.00
WHERE service_name = 'WhatsApp Setup';

-- Add other services as needed
