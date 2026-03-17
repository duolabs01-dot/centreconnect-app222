import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env before running this script.')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'public' }
})

const bajabulileId = 'f580f125-81ed-412a-8d25-f187605a6a69'

// SOURCE: Page 6 "Breakdown of Staff & Management" + Page 8 "Teachers/Practitioners List"
// Monthly Report Bajabulile Day Care Centre — February 2026
const correctStaff = [
  {
    first_name: 'Bajabulile Agnes',
    surname: 'Nong',
    id_number: '8308220557085',
    role: 'Project Manager',
    gender: 'F',
    race: 'B',
    is_disabled: false,
    disability_description: null,
    is_trained: true,
    training_description: 'Basic ECD Training',
    is_computer_literate: true,
    is_subsidized: true,
    monthly_salary: 4000.00,
  },
  {
    first_name: 'Engel Khansani',
    surname: 'Mabaso',
    id_number: '0012080203081',
    role: 'Practitioner/ECD Teacher',
    gender: 'F',
    race: 'B',
    is_disabled: false,
    disability_description: null,
    is_trained: true,
    training_description: 'Grade 12',
    is_computer_literate: false,
    is_subsidized: true,
    monthly_salary: 1600.00,
  },
  {
    first_name: 'Rebone Michel',
    surname: 'Mokalane',
    id_number: '9709171528083',
    role: 'Practitioner/ECD Teacher',
    gender: 'F',
    race: 'B',
    is_disabled: false,
    disability_description: null,
    is_trained: true,
    training_description: 'Grade 12',
    is_computer_literate: false,
    is_subsidized: true,
    monthly_salary: 1600.00,
  },
  {
    first_name: 'Sarah Nomula',
    surname: 'Ngwenya',
    id_number: '7111080637089',
    role: 'Chief/Cook',
    gender: 'F',
    race: 'B',
    is_disabled: false,
    disability_description: null,
    is_trained: true,
    training_description: 'Basic ECD Training',
    is_computer_literate: false,
    is_subsidized: true,
    monthly_salary: 2000.00,
  },
]

async function syncBajabulileStaff() {
  console.log('=== Syncing Bajabulile Day Care Centre Staff ===')

  // Step 1: Wipe ALL existing staff for this centre to start clean
  const { error: deleteError } = await supabase
    .from('ecd_staff')
    .delete()
    .eq('ecd_id', bajabulileId)

  if (deleteError) {
    console.error('Error clearing old staff records:', deleteError)
    process.exit(1)
  }
  console.log('Cleared existing staff records.')

  // Step 2: Insert the 4 correct staff members
  for (const staff of correctStaff) {
    const { error } = await supabase.from('ecd_staff').insert({
      ecd_id: bajabulileId,
      ...staff,
    })
    if (error) {
      console.error(`Failed to insert ${staff.first_name} ${staff.surname}:`, error.message)
    } else {
      console.log(`Inserted: ${staff.first_name} ${staff.surname} (${staff.role})`)
    }
  }

  // Step 3: Update centre metadata from cover page of Monthly Report
  const { error: centreError } = await supabase
    .from('ecd_centres')
    .update({
      primary_contact_name: 'Bajabulile Agnes Nong',
      primary_contact_phone: '074 359 2237',
      primary_contact_email: 'nongagnes@gmail.com',
      contact_phone: '074 359 2237',
      contact_email: 'nongagnes@gmail.com',
      emis_number: '700900442',
      npo_reg: '169-623',
      dsd_reg_number: '169-623 NPO',
      address_line1: 'No 6187 Aldo Mogano Street',
      address_line2: 'Far East Bank, Alexandra, Johannesburg, 2090',
      ward: '105',
      district: 'Johannesburg East',
      province: 'Gauteng',
      approved_capacity_partial_care: 32,
      approved_capacity_sla: 15,
    })
    .eq('id', bajabulileId)

  if (centreError) {
    console.error('Error updating centre metadata:', centreError.message)
  } else {
    console.log('Centre metadata updated successfully.')
  }

  console.log('=== Staff sync complete: 4 staff members inserted ===')
}

syncBajabulileStaff().catch(console.error)
