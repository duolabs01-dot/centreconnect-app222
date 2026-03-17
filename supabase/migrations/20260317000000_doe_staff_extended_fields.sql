BEGIN;

-- Extend ecd_staff with DOE monthly report required fields
ALTER TABLE public.ecd_staff
  ADD COLUMN IF NOT EXISTS gender TEXT,                     -- 'M' or 'F'
  ADD COLUMN IF NOT EXISTS race TEXT,                       -- 'B','W','C','I','A' (SA race classification)
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disability_description TEXT,
  ADD COLUMN IF NOT EXISTS training_description TEXT,       -- e.g. 'Grade 12', 'Basic ECD Training'
  ADD COLUMN IF NOT EXISTS is_subsidized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10,2);

-- Extend ecd_centres with full DOE/DSD centre metadata
ALTER TABLE public.ecd_centres
  ADD COLUMN IF NOT EXISTS npo_reg TEXT,                    -- DSD NPO registration number
  ADD COLUMN IF NOT EXISTS dsd_reg_number TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'Gauteng',
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT;        -- ECD registration number

COMMIT;
