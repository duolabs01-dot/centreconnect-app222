import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env before running this script.')

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function applyMigrations() {
  console.log('Adding new columns to ecd_centres...')
  const { error: centresError } = await supabase.rpc('exec_sql', {
    sql_query: `
      ALTER TABLE public.ecd_centres 
      ADD COLUMN IF NOT EXISTS emis_number TEXT,
      ADD COLUMN IF NOT EXISTS approved_capacity_partial_care INTEGER,
      ADD COLUMN IF NOT EXISTS approved_capacity_sla INTEGER,
      ADD COLUMN IF NOT EXISTS ward TEXT,
      ADD COLUMN IF NOT EXISTS district TEXT DEFAULT 'Johannesburg East';
    `
  })
  if (centresError) console.error('Error updating ecd_centres:', centresError)

  console.log('Creating ecd_staff table...')
  const { error: staffError } = await supabase.rpc('exec_sql', {
    sql_query: `
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
      ALTER TABLE public.ecd_staff ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "ECD admins can manage their own staff" ON public.ecd_staff;
      CREATE POLICY "ECD admins can manage their own staff" 
        ON public.ecd_staff FOR ALL 
        USING (ecd_id IN (SELECT ecd_id FROM ecd_admins WHERE user_id = auth.uid()));
    `
  })
  if (staffError) console.error('Error creating ecd_staff:', staffError)

  console.log('Updating children table for parent income tracking...')
  const { error: childrenError } = await supabase.rpc('exec_sql', {
    sql_query: `
      ALTER TABLE public.children
      ADD COLUMN IF NOT EXISTS parent_income_category TEXT, -- 'R0-R3500', 'R0-R4500', 'Other'
      ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS disability_description TEXT;
    `
  })
  if (childrenError) console.error('Error updating children:', childrenError)
}

// Note: If exec_sql RPC doesn't exist, we might need a different approach.
// Let's check if we can run it.
applyMigrations().then(() => console.log('Done')).catch(console.error)
