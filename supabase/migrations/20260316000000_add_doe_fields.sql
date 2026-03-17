BEGIN;

-- Add DOE-required columns to ecd_centres
ALTER TABLE public.ecd_centres
ADD COLUMN IF NOT EXISTS emis_number TEXT,
ADD COLUMN IF NOT EXISTS approved_capacity_partial_care INTEGER,
ADD COLUMN IF NOT EXISTS approved_capacity_sla INTEGER,
ADD COLUMN IF NOT EXISTS ward TEXT,
ADD COLUMN IF NOT EXISTS district TEXT DEFAULT 'Johannesburg East';

-- Create the official ecd_staff table for DOE reporting
CREATE TABLE IF NOT EXISTS public.ecd_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  id_number TEXT,
  role TEXT NOT NULL, -- e.g., 'practitioner', 'volunteer', 'principal'
  is_trained BOOLEAN DEFAULT FALSE,
  is_computer_literate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for the new staff table
ALTER TABLE public.ecd_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ECD admins can manage their own staff" ON public.ecd_staff;
CREATE POLICY "ECD admins can manage their own staff"
  ON public.ecd_staff
  FOR ALL
  USING (ecd_id IN (SELECT ecd_id FROM public.ecd_admins WHERE user_id = auth.uid()));

-- Add columns to children table for income and disability tracking
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS parent_income_category TEXT, -- 'R0-R3500', 'R0-R4500', 'Other'
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disability_description TEXT;

COMMIT;
