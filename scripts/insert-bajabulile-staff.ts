import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYWV6eWlpamVxa2plcHBwenplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxODQ5OCwiZXhwIjoyMDg2Nzk0NDk4fQ.qMsLAhm4zbPYGu4RVnk-CcwuYA8wSR-Gze4jiG_6ahM'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'public' }
})

const bajabulileId = 'f580f125-81ed-412a-8d25-f187605a6a69'

const staffToInsert = [
  { first_name: "Bajabulile Agnes", surname: "Nong", role: "Principal & Owner", id_number: "750401XXXXXXX", is_trained: true, is_computer_literate: true },
  { first_name: "Nomusa", surname: "Dladla", role: "Practitioner", id_number: "820615XXXXXXX", is_trained: true, is_computer_literate: false },
  { first_name: "Bongiwe", surname: "Zondi", role: "Practitioner", id_number: "881120XXXXXXX", is_trained: true, is_computer_literate: true },
  { first_name: "Sipho", surname: "Khumalo", role: "Volunteer", id_number: "950210XXXXXXX", is_trained: false, is_computer_literate: false },
  { first_name: "Lindiwe", surname: "Mokoena", role: "Cook", id_number: "700905XXXXXXX", is_trained: false, is_computer_literate: false }
]

async function insertBajabulileStaff() {
  console.log('Synchronising Bajabulile staff records...')
  
  const { data: existingStaff, error: fetchError } = await supabase
    .from('ecd_staff')
    .select('id, first_name, surname')
    .eq('ecd_id', bajabulileId)
  
  if (fetchError) {
    console.error('Error fetching staff for cleanup:', fetchError)
  } else {
    const legacyStaff = existingStaff?.filter(s => 
      s.first_name?.toLowerCase().includes('themba') || 
      s.surname?.toLowerCase().includes('mthembu')
    )
    if (legacyStaff && legacyStaff.length > 0) {
      console.log(`Found ${legacyStaff.length} legacy records to remove.`)
      for (const ls of legacyStaff) {
        await supabase.from('ecd_staff').delete().eq('id', ls.id)
        console.log(`Deleted legacy record: ${ls.first_name} ${ls.surname}`)
      }
    } else {
      console.log('No legacy "Themba Mthembu" records found in ecd_staff.')
    }
  }

  // 2. Ensure primary contact in ecd_centres is correct
  const { error: centreUpdateError } = await supabase
    .from('ecd_centres')
    .update({ primary_contact_name: 'Bajabulile Agnes Nong' })
    .eq('id', bajabulileId)
  
  if (centreUpdateError) {
    console.error('Error updating centre contact:', centreUpdateError)
  } else {
    console.log('Successfully updated primary contact to Bajabulile Agnes Nong.')
  }
  
  for (const staff of staffToInsert) {
    const { data: existing } = await supabase
      .from('ecd_staff')
      .select('id')
      .eq('ecd_id', bajabulileId)
      .ilike('first_name', staff.first_name)
      .ilike('surname', staff.surname)
      .maybeSingle()

    if (existing) {
      console.log(`Updating existing staff: ${staff.first_name} ${staff.surname}`)
      await supabase
        .from('ecd_staff')
        .update({
          role: staff.role,
          id_number: staff.id_number,
          is_trained: staff.is_trained,
          is_computer_literate: staff.is_computer_literate
        })
        .eq('id', existing.id)
    } else {
      console.log(`Creating new staff: ${staff.first_name} ${staff.surname}`)
      await supabase
        .from('ecd_staff')
        .insert({
          ecd_id: bajabulileId,
          ...staff
        })
    }
  }
  
  console.log('Staff insertion complete!')
}

insertBajabulileStaff()
