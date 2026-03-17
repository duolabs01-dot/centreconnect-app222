BEGIN;

-- Add missing centre fields that the staff script expects
ALTER TABLE public.ecd_centres 
  ADD COLUMN IF NOT EXISTS emis_number TEXT,
  ADD COLUMN IF NOT EXISTS approved_capacity_partial_care INTEGER,
  ADD COLUMN IF NOT EXISTS approved_capacity_sla INTEGER,
  ADD COLUMN IF NOT EXISTS ward TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT DEFAULT 'Johannesburg East';

COMMIT;
