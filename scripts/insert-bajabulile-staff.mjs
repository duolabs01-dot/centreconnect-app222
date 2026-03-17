import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env before running this script.')

const supabase = createClient(supabaseUrl, serviceRoleKey)

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
    first_name: 'Engel',
    surname: 'Khansani Mabaso',
    id_number: '0012080203081',
    role: 'Practitioner/ECD Teacher',
    gender: 'F',
    race: 'B',
    is_disabled: false,
    disability_description: null,
    is_trained: true,
    training_description: 'Basic ECD Training',
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
    training_description: 'Basic ECD Training',
    is_computer_literate: false,
    is_subsidized: true,
    monthly_salary: 1600.00,
  },
  {
    first_name: 'Sarah',
    surname: 'Nomula Ngwenya',
    id_number: '7111080637089',
    role: 'Chief/Cook',
    gender: 'F',
    race: 'B',
    is_disabled: false,
    disability_description: null,
    is_trained: false,
    training_description: null,
    is_computer_literate: false,
    is_subsidized: true,
    monthly_salary: 2000.00,
  },
]

async function syncStaff() {
  console.log('Deleting all existing staff for Bajabulile...')
  const { error: deleteError } = await supabase
    .from('ecd_staff')
    .delete()
    .eq('ecd_id', bajabulileId)

  if (deleteError) {
    console.error('Error deleting existing staff:', deleteError)
    return
  }

  console.log('Inserting correct 4 staff members...')
  for (const staff of correctStaff) {
    const { error } = await supabase
      .from('ecd_staff')
      .insert({
        ecd_id: bajabulileId,
        ...staff,
      })

    if (error) {
      console.error(`Error inserting staff ${staff.first_name} ${staff.surname}:`, error)
    } else {
      console.log(`✓ Inserted: ${staff.first_name} ${staff.surname} (${staff.role})`)
    }
  }

  // Update centre metadata from page 1 of PDF
  console.log('Updating centre metadata...')
  const { error: centreError } = await supabase
    .from('ecd_centres')
    .update({
      emis_number: '700900442',
      npo_reg: '169-623',
      dsd_reg_number: null,
      address_line1: '3902 Ext 7 Jabulani',
      address_line2: 'Soweto',
      province: 'Gauteng',
      ward: '52',
      district: 'Johannesburg East',
      primary_contact_name: 'Bajabulile Agnes Nong',
      primary_contact_phone: '083 822 0557',
      primary_contact_email: null,
      contact_phone: '083 822 0557',
      contact_email: null,
      approved_capacity_partial_care: 30,
      approved_capacity_sla: 30,
    })
    .eq('id', bajabulileId)

  if (centreError) {
    console.error('Error updating centre metadata:', centreError)
  } else {
    console.log('✓ Updated centre metadata')
  }

  console.log('Staff sync complete!')
}

syncStaff().catch(console.error)
