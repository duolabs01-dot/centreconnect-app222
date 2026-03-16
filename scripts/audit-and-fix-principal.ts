import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYWV6eWlpamVxa2plcHBwenplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxODQ5OCwiZXhwIjoyMDg2Nzk0NDk4fQ.qMsLAhm4zbPYGu4RVnk-CcwuYA8wSR-Gze4jiG_6ahM'

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
