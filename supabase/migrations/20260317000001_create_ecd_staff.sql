BEGIN;

-- Create ecd_staff table with all DOE fields
CREATE TABLE IF NOT EXISTS public.ecd_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  id_number TEXT,
  role TEXT NOT NULL,
  gender TEXT,                     -- 'M' or 'F'
  race TEXT,                       -- 'B','W','C','I','A' (SA race classification)
  is_disabled BOOLEAN DEFAULT FALSE,
  disability_description TEXT,
  is_trained BOOLEAN DEFAULT FALSE,
  training_description TEXT,       -- e.g. 'Grade 12', 'Basic ECD Training'
  is_computer_literate BOOLEAN DEFAULT FALSE,
  is_subsidized BOOLEAN DEFAULT FALSE,
  monthly_salary DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ecd_staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "ECD admins can manage their own staff" ON public.ecd_staff;
CREATE POLICY "ECD admins can manage their own staff" 
  ON public.ecd_staff FOR ALL 
  USING (ecd_id IN (SELECT ecd_id FROM ecd_admins WHERE user_id = auth.uid()));

COMMIT;
