import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env before running this script.')

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function auditAndFix() {
  console.log('--- STARTING COMPREHENSIVE DATA AUDIT ---')
  const bajabulileId = 'f580f125-81ed-412a-8d25-f187605a6a69'

  // 1. Audit Staff Table
  const { data: staff } = await supabase
    .from('ecd_staff')
    .select('*')
    .eq('ecd_id', bajabulileId)
  
  console.log('Found staff records:', staff?.length)
  
  for (const s of (staff || [])) {
    if (s.first_name === 'Themba' && s.surname === 'Mthembu') {
      console.log(`MATCH FOUND: Staff ID ${s.id} - Replacing with Bajabulile Agnes Nong`)
      await supabase
        .from('ecd_staff')
        .update({
          first_name: 'Bajabulile Agnes',
          surname: 'Nong',
          role: 'Principal & Owner'
        })
        .eq('id', s.id)
    }
  }

  // 2. Audit Centre Table
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('id, name, primary_contact_name')
    .eq('id', bajabulileId)
    .single()

  if (centre?.primary_contact_name?.includes('Themba') || centre?.primary_contact_name?.includes('Mthembu')) {
    console.log(`MATCH FOUND: Centre ID ${centre.id} - Replacing primary contact with Bajabulile Agnes Nong`)
    await supabase
      .from('ecd_centres')
      .update({ primary_contact_name: 'Bajabulile Agnes Nong' })
      .eq('id', centre.id)
  }

  console.log('--- AUDIT AND REPLACEMENT COMPLETE ---')
}

auditAndFix().catch(console.error)
